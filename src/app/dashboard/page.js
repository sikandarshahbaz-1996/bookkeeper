'use client';

import React from 'react';
import styles from './page.module.css';
import { useAuth } from '@/context/AuthContext';
import withAuth from '@/components/withAuth'; // Import the HOC

function DashboardPage() { // Changed to regular function declaration
  const { user } = useAuth();

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Dashboard</h1>
      {user ? (
        <p className={styles.welcomeMessage}>
          Welcome to your dashboard, {user.name}! ({user.role})
        </p>
      ) : (
        <p>Loading user data...</p>
      )}
      {/* Dashboard content will go here */}
      <p>This page is protected. Only logged-in users can see this.</p>
    </div>
  );
}

export default withAuth(DashboardPage); // Wrap component with HOC for export
