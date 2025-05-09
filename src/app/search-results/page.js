'use client';

import React, { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
// Navbar and Footer are typically in RootLayout, not imported here directly
// import Navbar from '../components/Navbar/Navbar'; 
// import Footer from '../components/Footer/Footer';   
// You might need a withAuth HOC if this page requires authentication
// import withAuth from '@/components/withAuth'; 

// Fallback component for Suspense
function SearchResultsLoading() {
  return <div className={styles.container}><p className={styles.loadingText}>Loading search results...</p></div>;
}

function SearchResultsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get('q') || ''; // Get initial query from URL

  const [searchQueryInput, setSearchQueryInput] = useState(initialQuery); // For the search bar on this page
  const [results, setResults] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalResults: 0,
    limit: 10, // Should match backend limit
  });

  useEffect(() => {
    const currentQueryFromUrl = searchParams.get('q') || '';
    setSearchQueryInput(currentQueryFromUrl); // Sync input field with URL query
    const currentPage = parseInt(searchParams.get('page') || '1', 10);
    if (currentQueryFromUrl) {
      fetchResults(currentQueryFromUrl, currentPage);
    } else {
      setResults([]); 
      setPagination({ currentPage: 1, totalPages: 1, totalResults: 0, limit: 10 });
    }
  }, [searchParams]); // Re-fetch if searchParams (q or page) change

  const fetchResults = async (currentQuery, page = 1) => {
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch(`/api/professionals/search?q=${encodeURIComponent(currentQuery)}&page=${page}&limit=${pagination.limit}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch search results');
      }
      const data = await response.json();
      setResults(data.professionals || []);
      // Removed console.log for sample professional data
      setPagination(data.pagination || { currentPage: page, totalPages: 1, totalResults: 0, limit: 10 });
    } catch (err) {
      setError(err.message);
      setResults([]);
      toast.error(`Error fetching results: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      // Update URL to reflect new page, which will trigger useEffect
      router.push(`/search-results?q=${encodeURIComponent(query)}&page=${newPage}`);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQueryInput.trim()) {
      // Navigate to update URL query param 'q', which triggers useEffect
      router.push(`/search-results?q=${encodeURIComponent(searchQueryInput.trim())}`);
    }
  };
  
  const currentQueryDisplay = searchParams.get('q') || '';


  // if (!currentQueryDisplay && !isLoading) { // Show this only if there was truly no query attempt
  //   return (
  //     <div className={styles.container}>
  //       <p className={styles.infoText}>Please enter a search term to find professionals.</p>
  //       <Link href="/dashboard" className={styles.backLink}>Back to Dashboard</Link>
  //     </div>
  //   );
  // }

  return (
    <div className={styles.container}>
      {/* Search Bar Added Here */}
      <div className={styles.searchContainerOnResultsPage}>
        <form onSubmit={handleSearchSubmit} className={styles.searchForm}>
          <input
            type="text"
            value={searchQueryInput}
            onChange={(e) => setSearchQueryInput(e.target.value)}
            placeholder="Search professionals..."
            className={styles.searchInput}
          />
          <button type="submit" className={styles.searchButton}>Search</button>
        </form>
      </div>

      {/* Removed h1 title: <h1 className={styles.title}>Search Results for "{currentQueryDisplay}"</h1> */}
      
      {isLoading && <p className={styles.loadingText}>Loading...</p>}
      {error && <p className={styles.errorText}>Error: {error}</p>}
      
      {!isLoading && !error && results.length === 0 && currentQueryDisplay && (
        <p className={styles.infoText}>No professionals found matching "{currentQueryDisplay}".</p>
      )}
       {!isLoading && !error && results.length === 0 && !currentQueryDisplay && (
        <p className={styles.infoText}>Enter a search term above to find professionals.</p>
      )}


      {!isLoading && !error && results.length > 0 && (
        <>
          <div className={styles.resultsGrid}> {/* This class will be changed to stack items */}
            {results.map(prof => (
              <Link key={prof._id} href={`/professional/${prof._id}`} className={styles.profileCardLink}>
                <div className={styles.profileCard}>
                  <h3>{prof.name || prof.businessName || 'N/A'}</h3>
                  {/* prof.profession is not in the sample, will not render if undefined */}
                  {prof.profession && <p className={styles.professionInCard}>{prof.profession}</p>}
                  {/* Display businessName if it exists and is different from the main name, or if prof.name is not present */}
                  {prof.businessName && prof.name !== prof.businessName && <p className={styles.businessNameInCard}>Company: {prof.businessName}</p>}
                  {prof.businessName && !prof.name && <p className={styles.businessNameInCard}>Company: {prof.businessName}</p>}
                                    
                  {prof.businessAddress && <p><strong>Location:</strong> {prof.businessAddress.split(',').slice(0, 2).join(',')}</p>} {/* Show first 2 parts of address for brevity */}
                  
                  {prof.servicesOffered && prof.servicesOffered.length > 0 && (
                    <p className={styles.servicesSummary}>
                      <strong>Services:</strong>{' '}
                      {prof.servicesOffered
                        .slice(0, 3)
                        .map(serviceObj => serviceObj.name) // Correctly access the 'name' property
                        .join(', ')}
                      {prof.servicesOffered.length > 3 ? '...' : ''}
                    </p>
                  )}
                  {(!prof.servicesOffered || prof.servicesOffered.length === 0) && (
                     <p className={styles.servicesSummary}><strong>Services:</strong> Not specified</p>
                  )}
                  <span className={styles.viewProfileButton}>View Profile</span>
                </div>
              </Link>
            ))}
          </div>

          {/* Pagination Controls */}
          {pagination.totalPages > 1 && (
            <div className={styles.paginationControls}>
              <button onClick={() => handlePageChange(pagination.currentPage - 1)} disabled={!pagination.hasPrevPage}>
                Previous
              </button>
              <span>Page {pagination.currentPage} of {pagination.totalPages}</span>
              <button onClick={() => handlePageChange(pagination.currentPage + 1)} disabled={!pagination.hasNextPage}>
                Next
              </button>
            </div>
          )}
        </>
      )}
       <Link href="/dashboard" className={styles.backLink} style={{marginTop: '2rem'}}>Back to Dashboard</Link>
    </div>
  );
}


export default function SearchResultsPage() {
  return (
    <Suspense fallback={<SearchResultsLoading />}>
      <SearchResultsContent />
    </Suspense>
  );
}
