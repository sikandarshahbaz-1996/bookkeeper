'use client'; // Required for using hooks like useSearchParams and useState

import React, { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import { useAuth } from '@/context/AuthContext'; // Import useAuth

export default function SignInPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth(); // Get login function from context
  const [activeTab, setActiveTab] = useState('user');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const proParam = searchParams.get('pro');
    const userParam = searchParams.get('user');
    if (proParam !== null) {
      setActiveTab('professional');
    } else if (userParam !== null) {
      setActiveTab('user');
    }
    // If neither param is present, it defaults to 'user' as set in useState
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  const signupLink = activeTab === 'user' ? "/signup-user" : "/signup-professional";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        // Include the activeTab as intendedRole in the payload
        body: JSON.stringify({ email, password, intendedRole: activeTab }), 
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Sign in failed. Please check your credentials.');
      }

      // Handle successful sign-in
      if (data.token && data.user) {
        login(data.user, data.token); // Call context login function
        // No need to manually set localStorage or redirect here, context handles it
      } else {
        throw new Error('Sign in failed. Invalid response from server.');
      }

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.signInBox}>
        <div className={styles.tabContainer}>
          <button
            className={`${styles.tabButton} ${activeTab === 'user' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('user')}
          >
            User
          </button>
          <button
            className={`${styles.tabButton} ${activeTab === 'professional' ? styles.activeTab : ''}`}
            onClick={() => handleTabChange('professional')}
          >
            Professional
          </button>
        </div>
        
        {error && <p className={styles.errorMessage}>{error}</p>} {/* Added error message display */}
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>Email</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              className={styles.input} 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required 
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input 
              type="password" 
              id="password" 
              name="password" 
              className={styles.input} 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required 
            />
          </div>
          <div className={styles.forgotPasswordContainer}>
            <Link href="/forgot-password" className={styles.forgotPasswordLink}>
              Forgot Password?
            </Link>
          </div>
          <button type="submit" className={styles.signInButton} disabled={loading}>
            {loading ? 'Signing In...' : 'Sign In'}
          </button>
        </form>
        <div className={styles.signUpPrompt}>
          <p>New user? <Link href={signupLink} className={styles.signUpLink}>Sign Up</Link></p>
        </div>
      </div>
    </div>
  );
}
