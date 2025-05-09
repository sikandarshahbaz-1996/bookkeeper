'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation'; // Import useRouter
import Link from 'next/link';
import styles from './page.module.css';
import { FaArrowLeft, FaMapMarkerAlt, FaBriefcase, FaClock, FaGlobe, FaPhone, FaRegBuilding, FaUserTie, FaTools, FaStreetView, FaInfoCircle, FaEnvelope } from 'react-icons/fa'; // Added FaEnvelope

function ProfessionalProfileContent() {
  const params = useParams();
  const router = useRouter(); // Initialize router
  const id = params?.id;
  const [professional, setProfessional] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (id) {
      const fetchProfessional = async () => {
        setLoading(true);
        setError('');
        try {
          const response = await fetch(`/api/professionals/${id}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Failed to fetch professional: ${response.statusText}`);
          }
          const data = await response.json();
          setProfessional(data);
        } catch (err) {
          console.error("Fetch error:", err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchProfessional();
    } else {
      setError('Professional ID not found in URL.');
      setLoading(false);
    }
  }, [id]);

  if (loading) {
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
          <button onClick={() => router.back()} className={styles.backButton}>
            <FaArrowLeft /> Back to Search
          </button>
        </div>
        <header className={styles.header}>
          <h1 className={styles.name}>{professional.name || 'N/A'}</h1> 
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
