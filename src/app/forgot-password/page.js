'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify'; // Import toast
import styles from './page.module.css';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    // TODO: Implement actual API call to backend for password reset
    console.log('Forgot password form submitted for:', email);
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 1000)); 

    // Replace alert with toast
    // alert('Password reset instructions would be sent if this were a real app!');
    toast.info('If an account exists for this email, password reset instructions have been sent.');
    
    setLoading(false);
    // Optionally clear email field or redirect
    // setEmail(''); 
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
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={styles.input}
              required
              placeholder="you@example.com"
            />
          </div>
          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Sending...' : 'Send Reset Link'}
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
