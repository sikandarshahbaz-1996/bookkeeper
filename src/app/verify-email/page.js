'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify'; // Import toast
import styles from './page.module.css';

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  // const [error, setError] = useState(''); // Replaced by toast
  // const [message, setMessage] = useState(''); // Replaced by toast
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  // Get email from query params on mount
  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      // setMessage(`Enter the 6-digit code sent to ${emailFromQuery}`); // Replaced by toast
      toast.info(`Enter the 6-digit code sent to ${emailFromQuery}`, { autoClose: false }); // Persist info message
    } else {
      // setError('Email parameter is missing. Cannot verify.'); // Replaced by toast
      toast.error('Email parameter is missing. Cannot verify.');
      // setMessage('Enter the 6-digit code sent to your email.');
    }
  }, [searchParams]);

  // Clear countdown timer on unmount
  useEffect(() => {
    let timer;
    if (countdown > 0) {
        timer = setInterval(() => {
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
    return () => clearInterval(timer); // Cleanup interval on component unmount
  }, [countdown]);


  const handleCodeChange = (e) => {
    // Allow only digits and limit length
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setCode(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    // setError(''); // No longer needed
    // setMessage(''); // No longer needed
    setLoading(true);

    if (code.length !== 6) {
      // setError('Please enter the 6-digit code.'); // Replaced by toast
      toast.error('Please enter the 6-digit code.');
      setLoading(false);
      return;
    }
    if (!email) {
        // setError('Email address not found. Cannot verify.'); // Replaced by toast
        toast.error('Email address not found. Cannot verify.');
        setLoading(false);
        return;
    }

    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Verification failed.');
      }

      // Success
      // alert('Email verified successfully! You can now sign in.'); // Replaced by toast
      toast.success('Email verified successfully! You can now sign in.');
      router.push('/signin'); // Redirect to sign-in

    } catch (err) {
      // setError(err.message); // Replaced by toast
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    // setError(''); // No longer needed
    // setMessage(''); // No longer needed
    setResendDisabled(true); // Disable button immediately
    setLoading(true); // Show loading state

     if (!email) {
        // setError('Email address not found. Cannot resend code.'); // Replaced by toast
        toast.error('Email address not found. Cannot resend code.');
        setLoading(false);
        setResendDisabled(false); // Re-enable if email missing
        return;
    }

    try {
        // Call signup API again to trigger resend logic (it handles upsert)
        const response = await fetch('/api/auth/signup', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: email, 
                name: 'Resend Request', // Placeholder
                password: 'placeholderpassword', // Placeholder
                role: 'customer' // Placeholder role, API should ignore if user exists
            }), 
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 409 && data.message.includes('verified')) {
                 // setMessage('Your email is already verified. Please proceed to sign in.'); // Replaced by toast
                 toast.info('Your email is already verified. Please proceed to sign in.');
                 setResendDisabled(false); // Keep disabled? Or allow retry? For now, keep disabled.
            } else {
                throw new Error(data.message || 'Failed to resend code.');
            }
        } else {
             // setMessage('A new verification code has been sent to your email.'); // Replaced by toast
             toast.success('A new verification code has been sent to your email.');
             setCountdown(60); // Start countdown handled by useEffect
        }

    } catch (err) {
        // setError(err.message); // Replaced by toast
        toast.error(err.message || 'An unexpected error occurred.');
        setResendDisabled(false); // Re-enable on error
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formBox}>
        <h1 className={styles.title}>Verify Your Email</h1>
        {/* Message and Error paragraphs removed, handled by toasts */}
        
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
