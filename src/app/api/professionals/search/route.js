import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb'; // Assuming you have a helper like this

const INDEX_NAME = 'professional_search_all_fields'; // The Atlas Search index name you created

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';
  const page = parseInt(searchParams.get('page') || '1', 10);
  const limit = parseInt(searchParams.get('limit') || '10', 10);

  if (limit > 50) { // Optional: limit the max results per page
    return NextResponse.json({ message: 'Limit cannot exceed 50' }, { status: 400 });
  }

  const skip = (page - 1) * limit;

  try {
    const usersCollection = await getCollection('users');

    // Define the fields to search. These should match what's in your Atlas Search index.
    // Using a wildcard '*' can search all indexed fields if your index is configured for it,
    // or list them explicitly.
    const searchPaths = [
      "name", "email", "phoneNumber", "qualifications", "experience", 
      "areasOfExpertise", "languagesSpoken", "softwareProficiency",
      "businessName", "businessAddress", "businessPhone", "businessEmail",
      "servicesOffered.service", "timezone", "availability.day"
    ];

    let searchStage;
    if (query) {
      searchStage = {
        $search: {
          index: INDEX_NAME,
          compound: {
            should: [
              {
                autocomplete: { // Prioritize autocomplete for name fields for better prefix matching
                  query: query,
                  path: "name",
                  fuzzy: { maxEdits: 1, prefixLength: 2, maxExpansions: 50 }
                }
              },
              {
                autocomplete: {
                  query: query,
                  path: "businessName",
                  fuzzy: { maxEdits: 1, prefixLength: 2, maxExpansions: 50 }
                }
              },
              {
                text: { // General text search with fuzzy on other fields
                  query: query,
                  path: searchPaths, // Search across all defined paths
                  fuzzy: {
                    maxEdits: 1, // Allow one edit (typo)
                    prefixLength: 2, // Require first 2 chars to be correct
                    maxExpansions: 50
                  }
                }
              }
            ],
            // You can add 'must' or 'filter' clauses here if needed
            // e.g., filter by role: 'professional' if not handled by a dedicated Atlas Search field
          }
        }
      };
    } else {
      // If no query, just list professionals (or return empty, or error)
      // For now, let's list all professionals if no query, still applying role filter
      searchStage = null; // No search stage if query is empty
    }
    
    const pipeline = [];

    if (searchStage) {
      pipeline.push(searchStage);
    }

    // Always filter for professionals
    pipeline.push({ $match: { role: 'professional' } });

    // Add a project stage to exclude sensitive fields like password
    // and to include the search score if a query was made
    const projectStage = {
      $project: {
        password: 0,
        verificationCode: 0,
        verificationCodeExpires: 0,
        // Add other fields to exclude if necessary
      }
    };
    if (query && searchStage) { // Only add score if a search was performed
      projectStage.$project.score = { $meta: "searchScore" };
      // Atlas Search typically returns results sorted by relevance by default when a query is provided.
      // Removing explicit sort to see if it resolves the error.
      // pipeline.push({ $sort: { score: { $meta: "searchScore" } } }); 
    } else {
      pipeline.push({ $sort: { name: 1 } }); // Default sort if no query
    }
    pipeline.push(projectStage);


    // Facet for pagination and results
    pipeline.push({
      $facet: {
        results: [
          { $skip: skip },
          { $limit: limit }
        ],
        totalCount: [
          { $count: 'count' }
        ]
      }
    });

    const aggregationResult = await usersCollection.aggregate(pipeline).toArray();
    
    const professionals = aggregationResult[0].results;
    const totalResults = aggregationResult[0].totalCount.length > 0 ? aggregationResult[0].totalCount[0].count : 0;
    const totalPages = Math.ceil(totalResults / limit);

    return NextResponse.json({
      professionals,
      pagination: {
        currentPage: page,
        totalPages,
        totalResults,
        limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Search API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
