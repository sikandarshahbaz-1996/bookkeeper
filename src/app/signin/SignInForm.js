'use client'; // Required for using hooks like useSearchParams and useState

import React, { useState, useEffect, Suspense } from 'react'; // Added Suspense here for clarity, though not strictly needed in this file
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css'; // Assuming styles are shared or adjust path if needed
import { useAuth } from '@/context/AuthContext'; // Import useAuth
import { toast } from 'react-toastify'; // Import toast

export default function SignInForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { login } = useAuth(); // Get login function from context
  const [activeTab, setActiveTab] = useState('user');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showResendLink, setShowResendLink] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State for password visibility

  useEffect(() => {
    const proParam = searchParams.get('pro');
    const userParam = searchParams.get('user');
    if (proParam !== null) {
      setActiveTab('professional');
    } else if (userParam !== null) {
      setActiveTab('user');
    }
  }, [searchParams]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setShowResendLink(false); // Hide resend link when changing tabs
  };

  const signupLink = activeTab === 'user' ? "/signup-user" : "/signup-professional";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setShowResendLink(false); // Hide resend link on new submission
    setLoading(true);

    try {
      const response = await fetch('/api/auth/signin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, intendedRole: activeTab }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403 && data.message.includes('Account not verified')) {
          setShowResendLink(true);
        } else {
          setShowResendLink(false);
        }
        throw new Error(data.message || 'Sign in failed. Please check your credentials.');
      }

      if (data.token && data.user) {
        login(data.user, data.token);
        // Redirect to dashboard or home page after successful login
        // router.push('/dashboard'); // Or appropriate page
      } else {
        throw new Error('Sign in failed. Invalid response from server.');
      }

    } catch (err) {
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
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

      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="email" className={styles.label}>Personal or Business Email</label>
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
        <div className={`${styles.inputGroup} ${styles.passwordGroup}`}>
          <label htmlFor="password" className={styles.label}>Password</label>
          <div className={styles.passwordInputWrapper}>
            <input
              type={showPassword ? 'text' : 'password'}
              id="password"
              name="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className={styles.togglePasswordButton}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>
        <div className={styles.forgotPasswordContainer}>
          <Link href="/forgot-password" className={styles.forgotPasswordLink}>
            Forgot Password?
          </Link>
        </div>
        {showResendLink && (
          <div className={styles.resendVerificationContainer}>
            <Link href={`/verify-email?email=${encodeURIComponent(email)}`} className={styles.resendLink}>
              Resend Verification Code
            </Link>
          </div>
        )}
        <button type="submit" className={styles.signInButton} disabled={loading}>
          {loading ? 'Signing In...' : 'Sign In'}
        </button>
      </form>
      <div className={styles.signUpPrompt}>
        <p>New user? <Link href={signupLink} className={styles.signUpLink}>Sign Up</Link></p>
      </div>
    </div>
  );
}
