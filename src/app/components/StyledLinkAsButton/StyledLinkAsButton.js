'use client';

import React from 'react';
import Link from 'next/link';
import styles from '../BackButton/BackButton.module.css'; // Reusing the same styles

const StyledLinkAsButton = ({ href, text, icon }) => {
  return (
    <Link href={href} className={styles.backButton}>
      {icon && <span className={styles.arrow}>{icon}</span>}
      {text}
    </Link>
  );
};

export default StyledLinkAsButton;
