import React, { Suspense } from 'react';
import styles from './page.module.css';
import VerifyEmailForm from './VerifyEmailForm'; // Import the new component

export default function VerifyEmailPage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={<div>Loading...</div>}>
        <VerifyEmailForm />
      </Suspense>
    </div>
  );
}
