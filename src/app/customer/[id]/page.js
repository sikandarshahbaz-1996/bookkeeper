'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import styles from './page.module.css'; // We'll create this file next
import Link from 'next/link';

const CustomerProfilePage = () => {
  const params = useParams();
  const { id: customerId } = params;
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (customerId) {
      const fetchCustomerDetails = async () => {
        setLoading(true);
        setError('');
        try {
          const response = await fetch(`/api/users/${customerId}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || `Error: ${response.status}`);
          }
          const data = await response.json();
          setCustomer(data);
        } catch (err) {
          console.error('Failed to fetch customer details:', err);
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchCustomerDetails();
    }
  }, [customerId]);

  if (loading) {
    return <div className={styles.container}><p>Loading customer profile...</p></div>;
  }

  if (error) {
    return <div className={styles.container}><p className={styles.errorText}>Error loading profile: {error}</p></div>;
  }

  if (!customer) {
    return <div className={styles.container}><p>Customer not found.</p></div>;
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.header}>Customer Profile</h1>
      <div className={styles.profileCard}>
        <div className={styles.profileItem}>
          <strong>Name:</strong> {customer.name}
        </div>
        <div className={styles.profileItem}>
          <strong>Email:</strong> {customer.email}
        </div>
        {customer.phoneNumber && (
          <div className={styles.profileItem}>
            <strong>Phone:</strong> {customer.phoneNumber}
          </div>
        )}
        {customer.address && (
          <div className={styles.profileItem}>
            <strong>Address:</strong> {customer.address}
          </div>
        )}
        {/* Add any other customer details you wish to display */}
        {/* Ensure not to display sensitive information */}
      </div>
      <Link href="/dashboard" className={styles.backLink}>
        Back to Dashboard
      </Link>
    </div>
  );
};

export default CustomerProfilePage;
