'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'react-toastify';
import styles from './page.module.css'; // Assuming styles are shared or adjust path if needed

export default function VerifyEmailForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendDisabled, setResendDisabled] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    const emailFromQuery = searchParams.get('email');
    if (emailFromQuery) {
      setEmail(emailFromQuery);
      toast.info(`Enter the 6-digit code sent to ${emailFromQuery}`, { autoClose: false });
    } else {
      toast.error('Email parameter is missing. Cannot verify.');
    }
  }, [searchParams]);

  useEffect(() => {
    let timer;
    if (countdown > 0) {
        timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer);
                    setResendDisabled(false);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    }
    return () => clearInterval(timer);
  }, [countdown]);

  const handleCodeChange = (e) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value.length <= 6) {
      setCode(value);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (code.length !== 6) {
      toast.error('Please enter the 6-digit code.');
      setLoading(false);
      return;
    }
    if (!email) {
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

      toast.success('Email verified successfully! You can now sign in.');
      router.push('/signin');

    } catch (err) {
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = async () => {
    setResendDisabled(true);
    setLoading(true);

     if (!email) {
        toast.error('Email address not found. Cannot resend code.');
        setLoading(false);
        setResendDisabled(false);
        return;
    }

    try {
        const response = await fetch('/api/auth/signup', { // Assuming this endpoint handles resend
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: email,
                name: 'Resend Request', // Placeholder
                password: 'placeholderpassword', // Placeholder
                role: 'customer' // Placeholder role
            }),
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 409 && data.message.includes('verified')) {
                 toast.info('Your email is already verified. Please proceed to sign in.');
            } else {
                throw new Error(data.message || 'Failed to resend code.');
            }
        } else {
             toast.success('A new verification code has been sent to your email.');
             setCountdown(60);
        }

    } catch (err) {
        toast.error(err.message || 'An unexpected error occurred.');
        setResendDisabled(false);
    } finally {
        setLoading(false);
    }
  };

  return (
    <div className={styles.formBox}>
      <h1 className={styles.title}>Verify Your Email</h1>
      
      <form onSubmit={handleSubmit} className={styles.form}>
        <div className={styles.inputGroup}>
          <label htmlFor="code" className={styles.label}>Verification Code</label>
          <input
            type="text"
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
  );
}
