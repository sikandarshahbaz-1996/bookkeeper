'use client'; // Make it a client component

import React, { useEffect } from 'react'; // Import useEffect
import { useRouter } from 'next/navigation'; // Import useRouter
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import styles from './page.module.css';
import Link from 'next/link';

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

      <footer className={styles.footer}>
        <p>&copy; {new Date().getFullYear()} Bookkeeper Connect. All rights reserved.</p>
      </footer>
    </main>
  );
}
