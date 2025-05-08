'use client'; // Required for using hooks

import React from 'react';
import Link from 'next/link';
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import styles from './Navbar.module.css';

export default function Navbar() {
  const { user, isAuthenticated, loading, logout } = useAuth();

  return (
    <nav className={styles.navbar}>
      <div className={styles.navbarContainer}>
        <Link href="/" className={styles.logoLink}>
          <span className={styles.navbarTitle}>BOOKKEEPER</span>
        </Link>
        <div className={styles.navLinks}>
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
    </nav>
  );
}
