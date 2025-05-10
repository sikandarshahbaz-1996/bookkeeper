import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(req, { params }) {
  try {
    const client = await clientPromise;
    const db = client.db();
    // const { id: professionalIdString } = params; // Original destructuring
    const professionalIdString = params.id; // Direct access

    console.log(`[API /professionals/:id/reviews] Received professionalIdString from params: ${professionalIdString}`);

    if (!professionalIdString) {
      console.log("[API /professionals/:id/reviews] Professional ID string is missing from params.");
      return NextResponse.json({ message: 'Professional ID is required' }, { status: 400 });
    }

    let objectIdProfessionalId;
    try {
      objectIdProfessionalId = new ObjectId(professionalIdString);
      console.log(`[API /professionals/:id/reviews] Converted to ObjectId: ${objectIdProfessionalId.toString()}`);
    } catch (error) {
      console.error(`[API /professionals/:id/reviews] Invalid Professional ID format for string "${professionalIdString}":`, error);
      return NextResponse.json({ message: 'Invalid Professional ID format' }, { status: 400 });
    }

    // Fetch the user to ensure they exist and are a professional
    const professionalUser = await db.collection('users').findOne({ 
      _id: objectIdProfessionalId,
      role: 'professional' 
    });
    
    if (!professionalUser) {
      console.log(`[API /professionals/:id/reviews] Professional user not found in 'users' collection or is not a professional. Queried with ObjectId: ${objectIdProfessionalId.toString()}`);
      return NextResponse.json({ message: 'Professional not found' }, { status: 404 });
    }
    console.log(`[API /professionals/:id/reviews] Professional user found in 'users' collection:`, professionalUser._id.toString());

    // Fetch reviews for this professional, sorted by creation date (newest first)
    // We can also join with the 'users' collection to get customer names if needed.
    // For now, let's return basic review info.
    // const reviews = await db.collection('reviews')
    //   .find({ professionalId: objectIdProfessionalId })
    //   .sort({ createdAt: -1 })
    //   .toArray();

    // If you want to include customer names, you'd do an aggregation like this:
    const reviewsWithCustomerInfo = await db.collection('reviews').aggregate([
      { $match: { professionalId: objectIdProfessionalId } },
      { $sort: { createdAt: -1 } },
      {
        $lookup: {
          from: 'users', // Assuming your customers are in the 'users' collection
          localField: 'customerId',
          foreignField: '_id',
          as: 'customerInfo'
        }
      },
      {
        $unwind: { // $unwind to destructure the customerInfo array
          path: '$customerInfo',
          preserveNullAndEmptyArrays: true // Keep reviews even if customer not found (though unlikely)
        }
      },
      {
        $project: {
          _id: 1,
          rating: 1,
          comment: 1,
          createdAt: 1,
          appointmentId: 1,
          professionalId: 1,
          customerId: 1,
          customerName: '$customerInfo.name', // Or 'customerInfo.firstName' etc.
          // Add other fields from customerInfo as needed
        }
      }
    ]).toArray();
    
    // For simplicity now, we'll just return the reviews as is.
    // The frontend can then decide if it needs to fetch customer details separately or if IDs are enough.

    return NextResponse.json(reviewsWithCustomerInfo, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch reviews:', error);
    return NextResponse.json({ message: 'Failed to fetch reviews', error: error.message }, { status: 500 });
  }
}
