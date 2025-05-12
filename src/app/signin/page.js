import React, { Suspense } from 'react';
import styles from './page.module.css';
import SignInForm from './SignInForm'; // Import the new component

export default function SignInPage() {
  return (
    <div className={styles.container}>
      <Suspense fallback={<div>Loading...</div>}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
