'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import styles from './BackButton.module.css';

const BackButton = () => {
  const router = useRouter();

  return (
    <button onClick={() => router.back()} className={styles.backButton}>
      <span className={styles.arrow}>&#x2190;</span> Back
    </button>
  );
};

export default BackButton;
