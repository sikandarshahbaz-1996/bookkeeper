'use client';

import React from 'react';
import Link from 'next/link';
import styles from './page.module.css'; // We'll create this next

export default function ForgotPasswordPage() {
  const handleSubmit = (event) => {
    event.preventDefault();
    // Handle form submission logic here
    console.log('Forgot password form submitted for:', event.target.email.value);
    alert('Password reset instructions would be sent if this were a real app!');
  };

  return (
    <div className={styles.container}>
      <div className={styles.formBox}>
        <h1 className={styles.title}>Forgot Your Password?</h1>
        <p className={styles.subtitle}>
          No worries! Enter your email address below and we'll send you a link to reset your password.
        </p>
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              className={styles.input}
              required
              placeholder="you@example.com"
            />
          </div>
          <button type="submit" className={styles.submitButton}>
            Send Reset Link
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
