'use client';

import React from 'react';
import { useTheme } from '@/context/ThemeContext';
import styles from './ThemeToggleButton.module.css';

const ThemeToggleButton = () => {
  const { theme, toggleTheme } = useTheme();

  // Simple emoji icons for now, can be replaced with SVGs or icon library
  const SunIcon = () => <span>☀️</span>; 
  const MoonIcon = () => <span>🌙</span>;

  return (
    <button
      onClick={toggleTheme}
      className={styles.toggleButton}
      aria-label={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
      title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
    >
      {theme === 'light' ? <MoonIcon /> : <SunIcon />}
    </button>
  );
};

export default ThemeToggleButton;
