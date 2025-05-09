'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'react-toastify';
import styles from './page.module.css';

function VerifyResetCodeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const emailFromQuery = searchParams.get('email');

  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    if (emailFromQuery) {
      setEmail(decodeURIComponent(emailFromQuery));
    } else {
      toast.error('Email not found. Please try the forgot password process again.');
      router.push('/forgot-password');
    }
  }, [emailFromQuery, router]);

  const validatePassword = () => {
    if (password.length < 8) {
      setPasswordError('Password must be at least 8 characters long.');
      return false;
    }
    if (password !== confirmPassword) {
      setPasswordError('Passwords do not match.');
      return false;
    }
    setPasswordError('');
    return true;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!validatePassword()) {
      return;
    }
    setLoading(true);

    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code, newPassword: password }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || 'Password has been reset successfully!');
        router.push('/signin');
      } else {
        toast.error(data.message || 'Failed to reset password. Please check the code or try again.');
      }
    } catch (error) {
      console.error('Reset password error:', error);
      toast.error('An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!email) {
    // Still loading email or redirecting
    return (
      <div className={styles.container}>
        <div className={styles.formBox}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.formBox}>
        <h1 className={styles.title}>Reset Your Password</h1>
        <p className={styles.subtitle}>
          Enter the 6-digit code sent to <strong>{email}</strong> and set your new password.
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="code" className={styles.label}>Verification Code</label>
            <input
              type="text"
              id="code"
              name="code"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className={styles.input}
              required
              maxLength="6"
              placeholder="123456"
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>New Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (passwordError) validatePassword(); // Re-validate on change if there was an error
              }}
              className={`${styles.input} ${passwordError && styles.inputError}`}
              required
              placeholder="Enter new password"
            />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="confirmPassword" className={styles.label}>Confirm New Password</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (passwordError) validatePassword(); // Re-validate on change if there was an error
              }}
              className={`${styles.input} ${passwordError && styles.inputError}`}
              required
              placeholder="Confirm new password"
            />
            {passwordError && <p className={styles.errorMessage}>{passwordError}</p>}
          </div>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Resetting...' : 'Reset Password & Sign In'}
          </button>
        </form>
        <div className={styles.backToSignIn}>
          <Link href="/signin" className={styles.signInLink}>
            &larr; Back to Sign In
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function VerifyResetCodePage() {
  return (
    <Suspense fallback={<div className={styles.container}><div className={styles.formBox}><p>Loading page...</p></div></div>}>
      <VerifyResetCodeContent />
    </Suspense>
  );
}
