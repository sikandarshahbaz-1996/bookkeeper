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

      <section className={`${styles.section} ${styles.sectionSecondary}`}>
        <h2 className={styles.sectionTitle}>For Bookkeepers & Accountants</h2>
        <div className={styles.featuresGrid}>
          <div className={styles.featureCard}>
            <h3>Showcase Your Expertise</h3>
            <p>Create a professional profile, highlight your services, and reach a wider client base.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>Manage Clients Efficiently</h3>
            <p>Utilize our platform tools to streamline communication, file sharing, and project management.</p>
          </div>
          <div className={styles.featureCard}>
            <h3>Grow Your Practice</h3>
            <p>Connect with businesses actively seeking your skills and expand your professional network.</p>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className={`${styles.section} ${styles.howItWorksSection}`}>
        <h2 className={styles.sectionTitle}>How It Works</h2>
        <div className={styles.stepsGrid}>
          <div className={styles.stepCard}>
            <StepIcon number="1" />
            <h3>Sign Up</h3>
            <p>Businesses and Professionals create their accounts in minutes.</p>
          </div>
          <div className={styles.stepCard}>
            <StepIcon number="2" />
            <h3>Find Your Match</h3>
            <p>Businesses search for pros based on needs; Pros showcase their skills.</p>
          </div>
          <div className={styles.stepCard}>
            <StepIcon number="3" />
            <h3>Connect & Collaborate</h3>
            <p>Securely communicate, share files, and manage projects.</p>
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

      {/* Add extra space before footer */}
      <div style={{ marginBottom: '4rem' }}></div> 

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Bookkeeper Connect. All rights reserved.</p>
      </footer>
    </main>
  );
}
