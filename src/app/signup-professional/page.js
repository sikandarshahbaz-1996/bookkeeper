'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'react-toastify';
import styles from './page.module.css';

// No longer need offeredServicesWithOptions here, as services with rates are not set at signup.
// If there's a predefined list of general expertise areas for checkboxes, it would go here.
// For now, we'll make it a dynamic list of strings like qualifications/experience.

const languageOptions = [
  "English", "Mandarin Chinese", "Hindi", "Spanish", "French", "Standard Arabic",
  "Bengali", "Russian", "Portuguese", "Urdu", "Indonesian", "German", "Japanese",
  "Nigerian Pidgin", "Marathi", "Telugu", "Turkish", "Tamil", "Yue Chinese (Cantonese)",
  "Vietnamese", "Tagalog", "Wu Chinese", "Korean", "Iranian Persian", "Hausa",
  "Egyptian Arabic", "Swahili", "Javanese", "Italian", "Thai"
];

const softwareProficiencyOptions = [
  "QuickBooks Online", "QuickBooks Desktop", "Xero", "FreshBooks", "Zoho Books",
  "Sage Intacct", "NetSuite ERP", "Wave Accounting", "MYOB", "KashFlow",
  "FreeAgent", "SAP Business One", "Microsoft Dynamics 365"
];

const validatePassword = (password) => {
  if (password.length < 6) {
    return 'Password must be at least 6 characters long.';
  }
  if (!/[A-Z]/.test(password)) {
    return 'Password must contain at least one uppercase letter.';
  }
  if (!/[a-z]/.test(password)) {
    return 'Password must contain at least one lowercase letter.';
  }
  if (!/\d/.test(password)) {
    return 'Password must contain at least one number.';
  }
  return null; // Password is valid
};


export default function SignUpProfessionalPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    qualifications: [''],
    experience: [''],
    areasOfExpertise: [''], // For general skills (dynamic array of strings)
    servicesOffered: [], // Will be empty at signup
    languagesSpoken: [],
    softwareProficiency: []
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleDynamicListChange = (listName, index, value) => {
    const newList = [...formData[listName]];
    newList[index] = value;
    setFormData(prev => ({ ...prev, [listName]: newList }));
  };

  const addDynamicListItem = (listName) => {
    setFormData(prev => ({
      ...prev,
      [listName]: [...prev[listName], '']
    }));
  };

  const removeDynamicListItem = (listName, index) => {
    const newList = [...formData[listName]];
    if (newList.length > 1) {
      newList.splice(index, 1);
      setFormData(prev => ({ ...prev, [listName]: newList }));
    }
  };

  
  const handleCheckboxChange = (listName, value) => { // This is for general checkboxes like languages, software, and potentially predefined areasOfExpertise if we used checkboxes for them.
    setFormData(prev => {
      const currentList = prev[listName];
      if (currentList.includes(value)) {
        return { ...prev, [listName]: currentList.filter(item => item !== value) };
      } else {
        return { ...prev, [listName]: [...currentList, value] };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const passwordError = validatePassword(formData.password);
    if (passwordError) {
      toast.error(passwordError);
      setLoading(false);
      return;
    }

    // No servicesOffered to validate at signup anymore
    
    // Prepare payload
    const payload = {
      ...formData, 
      role: 'professional',
      qualifications: formData.qualifications.filter(q => q.trim() !== ''),
      experience: formData.experience.filter(exp => exp.trim() !== ''),
      areasOfExpertise: formData.areasOfExpertise.filter(area => area.trim() !== ''), // Send as array of strings
      servicesOffered: [], // Explicitly send empty array for servicesOffered at signup
    };

    try {
      const response = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      toast.info('Signup successful! Please check your email for a verification code.');
      router.push(`/verify-email?email=${encodeURIComponent(payload.email)}`);

    } catch (err) {
      toast.error(err.message || 'An unexpected error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formBox}>
        <h1 className={styles.title}>Professional Account Sign Up</h1>
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Basic Info */}
          <div className={styles.inputGroup}>
            <label htmlFor="name" className={styles.label}>Full Name</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} className={styles.input} required />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>Business Email Address</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} className={styles.input} required />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="phoneNumber" className={styles.label}>Phone Number</label>
            <input type="tel" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className={styles.input} />
          </div>
          <div className={`${styles.inputGroup} ${styles.passwordGroup}`}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <div className={styles.passwordInputWrapper}>
              <input
                type={showPassword ? 'text' : 'password'}
                id="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className={styles.input}
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className={styles.togglePasswordButton}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Qualifications */}
          <div className={styles.sectionTitle}>Qualifications</div>
          {formData.qualifications.map((q, index) => (
            <div key={`qual-${index}`} className={styles.dynamicInputGroup}>
              <input
                type="text"
                value={q}
                onChange={(e) => handleDynamicListChange('qualifications', index, e.target.value)}
                className={styles.input}
                placeholder={`Qualification ${index + 1}`}
              />
              {formData.qualifications.length > 1 && (
                <button type="button" onClick={() => removeDynamicListItem('qualifications', index)} className={styles.removeButton}>&ndash;</button>
              )}
              {index === formData.qualifications.length - 1 && (
                <button type="button" onClick={() => addDynamicListItem('qualifications')} className={styles.addButton}>Add</button>
              )}
            </div>
          ))}

          {/* Experience */}
          <div className={styles.sectionTitle}>Experience</div>
          {formData.experience.map((exp, index) => (
            <div key={`exp-${index}`} className={styles.dynamicInputGroup}>
              <input
                type="text"
                value={exp}
                onChange={(e) => handleDynamicListChange('experience', index, e.target.value)}
                className={styles.input}
                placeholder={`Experience ${index + 1}`}
              />
              {formData.experience.length > 1 && (
                <button type="button" onClick={() => removeDynamicListItem('experience', index)} className={styles.removeButton}>&ndash;</button>
              )}
              {index === formData.experience.length - 1 && (
                <button type="button" onClick={() => addDynamicListItem('experience')} className={styles.addButton}>Add</button>
              )}
            </div>
          ))}

          {/* Areas of Expertise (General Skills - Dynamic List) */}
          <div className={styles.sectionTitle}>Areas of Expertise</div>
          {formData.areasOfExpertise.map((area, index) => (
            <div key={`area-${index}`} className={styles.dynamicInputGroup}>
              <input
                type="text"
                value={area}
                onChange={(e) => handleDynamicListChange('areasOfExpertise', index, e.target.value)}
                className={styles.input}
                placeholder={`Area of Expertise ${index + 1}`}
              />
              {formData.areasOfExpertise.length > 1 && (
                <button type="button" onClick={() => removeDynamicListItem('areasOfExpertise', index)} className={styles.removeButton}>&ndash;</button>
              )}
              {index === formData.areasOfExpertise.length - 1 && (
                <button type="button" onClick={() => addDynamicListItem('areasOfExpertise')} className={styles.addButton}>Add</button>
              )}
            </div>
          ))}

          {/* Languages Spoken */}
          <div className={styles.sectionTitle}>Languages Spoken</div>
          <div className={styles.checkboxGrid}>
            {languageOptions.map(lang => (
              <label key={lang} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.languagesSpoken.includes(lang)}
                  onChange={() => handleCheckboxChange('languagesSpoken', lang)}
                /> {lang}
              </label>
            ))}
          </div>

          {/* Software Proficiency */}
          <div className={styles.sectionTitle}>Software Proficiency</div>
          <div className={styles.checkboxGrid}>
            {softwareProficiencyOptions.map(software => (
              <label key={software} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.softwareProficiency.includes(software)}
                  onChange={() => handleCheckboxChange('softwareProficiency', software)}
                /> {software}
              </label>
            ))}
          </div>

          <button type="submit" className={styles.submitButton} disabled={loading}>
            {loading ? 'Signing Up...' : 'Sign Up'}
          </button>
        </form>
        <div className={styles.backToSignIn}>
          <p>Already have an account? <Link href="/signin?pro=true" className={styles.signInLink}>Sign In</Link></p>
        </div>
      </div>
    </div>
  );
}
