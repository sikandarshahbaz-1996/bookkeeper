'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Import useRouter
import Link from 'next/link';
import styles from './page.module.css';
import { FaMapMarkerAlt, FaBriefcase, FaClock, FaGlobe, FaPhone, FaRegBuilding, FaUserTie, FaTools, FaStreetView, FaInfoCircle, FaEnvelope, FaStar, FaRegStar } from 'react-icons/fa'; // Added FaEnvelope, FaStar, FaRegStar
import BackButton from '@/app/components/BackButton/BackButton';

// Helper component to display stars
const DisplayStars = ({ rating, totalStars = 5 }) => {
  const fullStars = Math.floor(rating);
  const halfStar = rating % 1 >= 0.5 ? 1 : 0; // No half stars for now, simple floor
  const emptyStars = totalStars - fullStars - halfStar; // Adjust if using half stars

  return (
    <div className={styles.starsDisplay}>
      {[...Array(fullStars)].map((_, i) => <FaStar key={`full-${i}`} className={styles.starIcon} />)}
      {/* {[...Array(halfStar)].map((_, i) => <FaStarHalfAlt key={`half-${i}`} />)} // If using half stars */}
      {[...Array(emptyStars)].map((_, i) => <FaRegStar key={`empty-${i}`} className={styles.starIcon} />)}
      <span className={styles.ratingNumeric}>({rating.toFixed(1)})</span>
    </div>
  );
};


function ProfessionalProfileContent() {
  const params = useParams();
  const router = useRouter(); // Initialize router
  const id = params?.id;
  const [professional, setProfessional] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [reviews, setReviews] = useState([]);
  const [isLoadingReviews, setIsLoadingReviews] = useState(true);
  const [reviewsError, setReviewsError] = useState('');
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    if (id) {
      const fetchProfessional = async () => {
        setLoading(true);
        setError('');
        setProfessional(null); // Reset professional data on new ID
        try {
          const response = await fetch(`/api/professionals/${id}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to fetch professional: ${response.statusText}`);
          }
          const data = await response.json();
          // Check for a meaningful property like _id to ensure it's a valid professional object
          if (!data || !data._id) { 
            throw new Error('Professional not found.');
          }
          setProfessional(data);
        } catch (err) {
          console.error("Fetch professional error:", err);
          setError(err.message);
          setProfessional(null); // Ensure professional is null on error
        } finally {
          setLoading(false);
        }
      };
      fetchProfessional();
    } else {
      setError('Professional ID not found in URL.');
      setLoading(false);
      setProfessional(null);
    }
  }, [id]);

  // Separate useEffect for fetching reviews, dependent on 'id' and 'professional' being successfully fetched (and no main error)
  useEffect(() => {
    if (id && professional && !error) { // Only fetch reviews if professional exists and no primary error
      const fetchReviews = async () => {
        setIsLoadingReviews(true);
        setReviewsError('');
        setReviews([]); // Reset reviews
        setAverageRating(0); // Reset average rating
        try {
          const res = await fetch(`/api/professionals/${id}/reviews`);
          if (!res.ok) {
            const errData = await res.json();
            // If the reviews endpoint itself says "Professional not found", it's a bit redundant
            // but we'll still set it. The main error display should take precedence.
            throw new Error(errData.message || `Failed to fetch reviews: ${res.statusText}`);
          }
          const data = await res.json();
          setReviews(data || []);
          if (data && data.length > 0) {
            const totalRating = data.reduce((acc, review) => acc + review.rating, 0);
            setAverageRating(totalRating / data.length);
          } else {
            setAverageRating(0);
          }
        } catch (err) {
          console.error("Fetch reviews error:", err);
          setReviewsError(err.message);
        } finally {
          setIsLoadingReviews(false);
        }
      };
      fetchReviews();
    } else if (!professional && !loading && !error) {
      // If professional is null after loading and there's no main error,
      // it implies professional was not found by fetchProfessional.
      // So, no need to attempt fetching reviews.
      setIsLoadingReviews(false);
      setReviews([]);
      setAverageRating(0);
      // Optionally set a specific reviews message like "Cannot load reviews as professional was not found."
      // but the main "Professional not found" error should cover this.
    }
  }, [id, professional, error, loading]); // Add loading to dependencies

  if (loading) { // Main loading state for professional data
    return <div className={styles.loading}>Loading professional profile...</div>;
  }

  if (error) {
    return <div className={styles.error}>Error: {error} <Link href="/search-results" className={styles.contactLink}>Go back to search</Link></div>;
  }

  if (!professional) {
    return <div className={styles.error}>Professional not found. <Link href="/search-results" className={styles.contactLink}>Go back to search</Link></div>;
  }

  const DetailItem = ({ label, value, icon, isList = false, itemProperty = null, rateProperty = null }) => {
    // Special rendering for services with rates
    if (label === "Services Offered (with rates)" && isList && Array.isArray(value)) {
      return (
        <div className={styles.detailItem}>
          <span className={styles.detailLabel}>{icon} {label}</span>
          <ul className={styles.serviceList}>
            {value.map((item, index) => (
              <li key={index} className={styles.serviceListItem}>
                <span className={styles.serviceName}>{item[itemProperty] || (typeof item === 'object' ? JSON.stringify(item) : item)}</span>
                {rateProperty && item[rateProperty] !== undefined && (
                  <span className={styles.serviceRate}>${item[rateProperty]}/hr</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      );
    }
    // Default rendering for other items
    return (
      <div className={styles.detailItem}>
        <span className={styles.detailLabel}>{icon} {label}</span>
        {isList && Array.isArray(value) && value.length > 0 ? (
          <ul className={styles.detailValueList}>
            {value.map((item, index) => (
              <li key={index}>{itemProperty ? item[itemProperty] : (typeof item === 'object' ? JSON.stringify(item) : item)}</li>
            ))}
          </ul>
        ) : (
          <span className={styles.detailValue}>{value || 'Not specified'}</span>
        )}
      </div>
    );
  };
  
  return (
    <div className={styles.pageContainer}>
      <div className={styles.profileLayout}>
        <div className={styles.navigationHeader}>
          <BackButton />
        </div>
        <header className={styles.header}>
          <h1 className={styles.name}>{professional.name || 'N/A'}</h1>
          {/* Display Average Rating */}
          {!isLoadingReviews && reviews.length > 0 && (
            <div className={styles.averageRatingContainer}>
              <DisplayStars rating={averageRating} />
              <span>({reviews.length} review{reviews.length === 1 ? '' : 's'})</span>
            </div>
          )}
          {!isLoadingReviews && reviews.length === 0 && averageRating === 0 && (
            <p className={styles.noReviewsYetHeader}>No reviews yet</p>
          )}
          {professional.profession && <p className={styles.profession}><FaUserTie /> {professional.profession}</p>}
          {professional.businessName && <p className={styles.company}><FaRegBuilding /> {professional.businessName}</p>}
        </header>

        <div className={styles.detailsGrid}>
          {/* Use professional.businessAddress as location */}
          {professional.businessAddress && <DetailItem label="Location" value={professional.businessAddress} icon={<FaMapMarkerAlt />} />}
          {professional.experience && professional.experience.length > 0 && <DetailItem label="Experience Summary" value={professional.experience.join(', ')} icon={<FaBriefcase />} />}
          {/* professional.availability is an array of objects, needs special rendering */}
          {/* For now, let's skip complex availability rendering on this pass, can be added later */}
          {professional.phoneNumber && <DetailItem label="Phone" value={<a href={`tel:${professional.phoneNumber}`} className={styles.contactLink}>{professional.phoneNumber}</a>} icon={<FaPhone />} />}
          {professional.website && <DetailItem label="Website" value={<a href={professional.website && professional.website.startsWith('http') ? professional.website : `http://${professional.website}`} target="_blank" rel="noopener noreferrer" className={styles.contactLink}>{professional.website}</a>} icon={<FaGlobe />} />}
          {/* Email now comes before Languages */}
          {(professional.businessEmail || professional.email) && <DetailItem label={professional.businessEmail ? "Business Email" : "Personal Email"} value={<a href={`mailto:${professional.businessEmail || professional.email}`} className={styles.contactLink}>{professional.businessEmail || professional.email}</a>} icon={<FaEnvelope />} />}
          {professional.languagesSpoken && professional.languagesSpoken.length > 0 && <DetailItem label="Languages" value={professional.languagesSpoken.join(', ')} icon={<FaGlobe />} />}
          {professional.qualifications && professional.qualifications.length > 0 && <DetailItem label="Qualifications" value={professional.qualifications.join(', ')} icon={<FaUserTie />} />}
          {/* Display general areas of expertise (strings) */}
          {professional.areasOfExpertise && professional.areasOfExpertise.length > 0 && <DetailItem label="General Expertise" value={professional.areasOfExpertise.join(', ')} icon={<FaTools />} />}
          {professional.softwareProficiency && professional.softwareProficiency.length > 0 && <DetailItem label="Software Proficiency" value={professional.softwareProficiency.join(', ')} icon={<FaTools />} />}
        </div>
        
        {/* Display servicesOffered (objects with rates) */}
        {professional.servicesOffered && professional.servicesOffered.length > 0 && (
          <DetailItem label="Services Offered (with rates)" value={professional.servicesOffered} icon={<FaBriefcase />} isList={true} itemProperty="name" rateProperty="hourlyRate" />
        )}

        {/* serviceAreas is not in the sample API response, remove or adapt if it exists */}
        {/* {professional.serviceAreas && professional.serviceAreas.length > 0 && (
           <div className={styles.bioSection}>
            <h3><FaStreetView /> Service Areas</h3>
            <DetailItem value={professional.serviceAreas} isList={true} />
          </div>
        )} */}

        {professional.bio && ( // 'bio' field is not in the sample data from API
          <div className={styles.bioSection}>
            <h3><FaInfoCircle /> About {professional.name ? professional.name.split(' ')[0] : 'This Professional'}</h3>
            <p className={styles.bioText}>{professional.bio}</p>
          </div>
        )}

        <div className={styles.ctaSection}>
          <Link href={`/professional/${id}/generate-quote`} passHref>
            <button className={styles.bookButton}> {/* Re-using bookButton style for now */}
              Get a Quote
            </button>
          </Link>
        </div>

        {/* Reviews Section */}
        <div className={styles.reviewsSection}>
          <h2>Customer Reviews</h2>
          {isLoadingReviews && <p className={styles.loading}>Loading reviews...</p>}
          {reviewsError && <p className={styles.error}>Could not load reviews: {reviewsError}</p>}
          {!isLoadingReviews && !reviewsError && reviews.length === 0 && (
            <p>This professional has no reviews yet.</p>
          )}
          {!isLoadingReviews && !reviewsError && reviews.length > 0 && (
            <div className={styles.reviewsList}>
              {reviews.map(review => (
                <div key={review._id} className={styles.reviewCard}>
                  <div className={styles.reviewHeader}>
                    <DisplayStars rating={review.rating} />
                    <span className={styles.reviewCustomer}>
                      By: {review.customerName || 'Anonymous Customer'}
                    </span>
                  </div>
                  {review.comment && <p className={styles.reviewComment}>{review.comment}</p>}
                  <p className={styles.reviewDate}>
                    Reviewed on: {new Date(review.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


export default function ProfessionalPage() {
  return (
    // Suspense can be used here if you have a parent layout that might suspend
    // For now, the loading state is handled within ProfessionalProfileContent
    <Suspense fallback={<div className={styles.loading}>Loading page...</div>}>
      <ProfessionalProfileContent />
    </Suspense>
  );
}
