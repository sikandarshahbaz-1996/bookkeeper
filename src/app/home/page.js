'use client'; // Make it a client component

import React, { useEffect } from 'react'; // Import useEffect
import { useRouter } from 'next/navigation'; // Import useRouter
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import styles from './page.module.css';
import Link from 'next/link';
// Import specific icons from react-icons
import { FaUserCheck, FaLock, FaChartLine } from 'react-icons/fa'; 

// Placeholder icon for steps (can be kept or replaced)
const StepIcon = ({ number }) => <div className={styles.stepIcon}>{number}</div>;
// BenefitIcon component is no longer needed as we use react-icons directly


export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Redirect to dashboard if logged in and auth state is loaded
    if (!loading && isAuthenticated) {
      router.replace('/dashboard');
    }
  }, [isAuthenticated, loading, router]);

  // Optionally, show loading state or null while checking auth
  if (loading || isAuthenticated) {
    // Render loading or nothing to avoid flashing content before redirect
    return <div>Loading...</div>; // Or return null;
  }

  // Render home page content only if not loading and not authenticated
  return (
    <main className={styles.main}>
      <div className={styles.hero}>
        <h1 className={styles.title}>Connect with Expert Bookkeepers & Accountants</h1>
        <p className={styles.description}>
          Streamline your finances. Find trusted professionals for your bookkeeping and tax needs.
        </p>
        <div className={styles.ctaContainer}>
          <Link href="/signin?user=true" passHref>
            <button className={`${styles.ctaButton} ${styles.ctaButtonPrimary}`}>Find a Bookkeeper</button>
          </Link>
          <Link href="/signin?pro=true" passHref>
            <button className={`${styles.ctaButton} ${styles.ctaButtonSecondary}`}>I'm a Professional</button>
          </Link>
        </div>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>For Business Owners</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <h3>Access a Network of Professionals</h3>
            <p>Easily find and connect with vetted bookkeepers and accountants tailored to your industry and business size.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>Comprehensive Services</h3>
            <p>From daily bookkeeping to annual tax filing, get the support you need to stay compliant and informed.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>Transparent & Secure</h3>
            <p>Communicate and share documents securely. Know the costs upfront with transparent pricing.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={`${styles.section} ${styles.howItWorksSection}`}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <div className={styles.stepsTimeline}>
          {/* Step 1 */}
          <div className={styles.timelineItem}>
            <StepIcon number="1" />
            <div className={`${styles.stepCard} ${styles.stepCardOnLeft}`}>
              <h3>Join & Setup</h3>
              <p>Create your account and set up your profile, whether you're a business seeking expertise or a professional offering services.</p>
            </div>
          </div>
          {/* Step 2 */}
          <div className={styles.timelineItem}>
            <StepIcon number="2" />
            <div className={`${styles.stepCard} ${styles.stepCardOnRight}`}>
              <h3>Discover & Connect</h3>
              <p>Businesses easily find professionals using advanced search. Professionals showcase their expertise to a wide audience.</p>
            </div>
          </div>
          {/* Step 3 */}
          <div className={styles.timelineItem}>
            <StepIcon number="3" />
            <div className={`${styles.stepCard} ${styles.stepCardOnLeft}`}>
              <h3>Quote & Book</h3>
              <p>Request and receive transparent quotes. Securely book services that fit your needs and budget.</p>
            </div>
          </div>
          {/* Step 4 */}
          <div className={styles.timelineItem}>
            <StepIcon number="4" />
            <div className={`${styles.stepCard} ${styles.stepCardOnRight}`}>
              <h3>Collaborate & Succeed</h3>
              <p>Manage projects, share documents, and make payments securely, all in one place, to achieve your financial goals.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className={`${styles.section} ${styles.whyChooseUsSection}`}>
        <h2 className={styles.sectionTitle}>Why Choose Bookkeeper Connect?</h2>
        <div className={styles.benefitsGrid}>
          <div className={styles.benefitCard}>
            <div className={styles.benefitIconWrapper}> {/* Wrapper for styling */}
              <FaUserCheck size={40} /> {/* Use react-icon */}
            </div>
            <h3>Vetted Professionals</h3>
            <p>Connect with experienced and verified bookkeepers and accountants.</p>
          </div>
          <div className={styles.benefitCard}>
             <div className={styles.benefitIconWrapper}>
              <FaLock size={40} /> {/* Use react-icon */}
            </div>
            <h3>Secure Platform</h3>
            <p>Your data and communications are protected with robust security measures.</p>
          </div>
          <div className={styles.benefitCard}>
             <div className={styles.benefitIconWrapper}>
              <FaChartLine size={40} /> {/* Use react-icon */}
            </div>
            <h3>Grow Your Business</h3>
            <p>Whether finding clients or streamlining finances, we help you succeed.</p>
          </div>
        </div>
      </section>

      {/* Footer is now in RootLayout */}
    </main>
  );
}
