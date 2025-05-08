'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link'; // Import Link
import styles from './page.module.css';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Get email from query params on mount
  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      setMessage(`Enter the 6-digit code sent to ${emailFromQuery}`);
    } else {
      // Optional: redirect if email is missing, or show an error
      // setError('Email parameter is missing. Cannot verify.');
      setMessage('Enter the 6-digit code sent to your email.');
    }
  }, [searchParams]);

  const handleCodeChange = (e) => {
    // Allow only digits and limit length
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setCode(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    if (code.length !== 6) {
      setError('Please enter the 6-digit code.');
      setLoading(false);
      return;
    }
    if (!email) {
        setError('Email address not found. Cannot verify.');
        setLoading(false);
        return;
    }

    try {
      const response = await fetch('/api/auth/verify', { // API route to be created
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed.');
      }

      // Success
      alert('Email verified successfully! You can now sign in.');
      router.push('/signin'); // Redirect to sign-in

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setError('');
    setMessage('');
    setResendDisabled(true); // Disable button immediately
    setLoading(true); // Show loading state

     if (!email) {
        setError('Email address not found. Cannot resend code.');
        setLoading(false);
        setResendDisabled(false); // Re-enable if email missing
        return;
    }

    try {
        // Call signup API again to trigger resend logic (it handles upsert)
        // We need dummy data for name/password as they are required by signup API
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // Send minimal required data + email to trigger code regeneration/resend
            body: JSON.stringify({ 
                email: email, 
                name: 'Resend Request', // Placeholder
                password: 'placeholderpassword', // Placeholder
                role: 'customer' // Placeholder role, API should ignore if user exists
            }), 
        });

        const data = await response.json();

        if (!response.ok) {
            // Handle specific errors if needed, e.g., user already verified
            if (response.status === 409 && data.message.includes('verified')) {
                 setMessage('Your email is already verified. Please proceed to sign in.');
                 // Optionally redirect
                 // router.push('/signin');
            } else {
                throw new Error(data.message || 'Failed to resend code.');
            }
        } else {
             setMessage('A new verification code has been sent to your email.');
             // Start countdown timer
             setCountdown(60);
             const timer = setInterval(() => {
                 setCountdown((prev) => {
                     if (prev <= 1) {
                         clearInterval(timer);
                         setResendDisabled(false); // Re-enable button
                         return 0;
                     }
                     return prev - 1;
                 });
             }, 1000);
        }

    } catch (err) {
        setError(err.message);
        setResendDisabled(false); // Re-enable on error
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formBox}>
        <h1 className={styles.title}>Verify Your Email</h1>
        {message && <p className={styles.message}>{message}</p>}
        {error && <p className={styles.errorMessage}>{error}</p>}
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="code" className={styles.label}>Verification Code</label>
            <input
              type="text" // Use text to allow easier input, validation handles digits
              id="code"
              name="code"
              value={code}
              onChange={handleCodeChange}
              className={styles.input}
              required
              maxLength="6"
              placeholder="Enter 6-digit code"
              autoComplete="one-time-code"
            />
          </div>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Verifying...' : 'Verify Email'}
          </button>
        </form>

        <div className={styles.resendContainer}>
          <button 
            onClick={handleResendCode} 
            disabled={resendDisabled || loading} 
            className={styles.resendButton}
          >
            {resendDisabled ? `Resend Code (${countdown}s)` : 'Resend Code'}
          </button>
        </div>

        <div className={styles.backToSignIn}>
          <Link href="/signin" className={styles.signInLink}>
            &larr; Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}
