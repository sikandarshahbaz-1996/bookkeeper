'use client'; // Required for using hooks

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion'; // Import motion
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import styles from './Navbar.module.css';
import ThemeToggleButton from '../ThemeToggleButton/ThemeToggleButton'; // Import ThemeToggleButton

export default function Navbar() {
  const { user, isAuthenticated, loading, logout } = useAuth();

  const navbarVariants = {
    hidden: { y: -100, opacity: 0 },
    visible: { 
      y: 0, 
      opacity: 1, 
      transition: { 
        duration: 0.5, 
        delay: 0.3, // Slight delay
        ease: "easeOut" 
      } 
    },
  };

  return (
    <motion.nav 
      className={styles.navbar}
      variants={navbarVariants}
      initial="hidden"
      animate="visible"
    >
      <div className={styles.navbarContainer}>
        <Link href="/" className={styles.logoLink}>
          <span className={styles.navbarTitle}>BOOKKEEPER</span>
        </Link>
        <div className={styles.navLinks}>
          <ThemeToggleButton /> {/* Add ThemeToggleButton here */}
          {loading ? (
            // Optional: Show a loading indicator or nothing
             <div className={styles.loadingPlaceholder}></div> 
           ) : isAuthenticated && user ? (
             <>
               {/* <span className={styles.userName}>Welcome, {user.name}!</span> Removed again */}
               <button onClick={logout} className={styles.signOutButton}>
                 Sign Out
               </button>
            </>
          ) : (
            <Link href="/signin" className={styles.signInButton}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </motion.nav>
  );
}
