'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation'; // For redirection
import styles from './page.module.css';

// Placeholder data (would ideally come from a config or API)
const areasOfExpertiseOptions = [
  "Tax Preparation & Planning", "Audit & Assurance", "Forensic Accounting",
  "Management Accounting", "Bookkeeping Services", "Payroll Services",
  "Financial Advisory", "Risk Management", "Corporate Finance",
  "Non-profit Accounting", "International Accounting", "Estate & Trust Planning"
];

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

export default function SignUpProfessionalPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    password: '',
    qualifications: [''], // Initial empty qualification
    experience: [''],     // Initial empty experience
    areasOfExpertise: [],
    languagesSpoken: [],
    softwareProficiency: []
  });
  const [error, setError] = useState('');
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
    if (newList.length > 1) { // Keep at least one item
      newList.splice(index, 1);
      setFormData(prev => ({ ...prev, [listName]: newList }));
    }
  };

  const handleCheckboxChange = (listName, value) => {
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
    setError('');
    setLoading(true);

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    // Filter out empty strings from dynamic lists
    const payload = {
      ...formData,
      role: 'professional',
      qualifications: formData.qualifications.filter(q => q.trim() !== ''),
      experience: formData.experience.filter(exp => exp.trim() !== ''),
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

      // Handle success - redirect to verification page
      // alert('Professional account created successfully! Please sign in.'); // Old message
      router.push(`/verify-email?email=${encodeURIComponent(payload.email)}`); 

    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.formBox}>
        <h1 className={styles.title}>Professional Account Sign Up</h1>
        {error && <p className={styles.errorMessage}>{error}</p>} {/* Added error message display */}
        <form onSubmit={handleSubmit} className={styles.form}>
          {/* Basic Info */}
          <div className={styles.inputGroup}>
            <label htmlFor="name" className={styles.label}>Full Name</label>
            <input type="text" id="name" name="name" value={formData.name} onChange={handleInputChange} className={styles.input} required />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>Email Address</label>
            <input type="email" id="email" name="email" value={formData.email} onChange={handleInputChange} className={styles.input} required />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="phoneNumber" className={styles.label}>Phone Number</label>
            <input type="tel" id="phoneNumber" name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} className={styles.input} />
          </div>
          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Password</label>
            <input type="password" id="password" name="password" value={formData.password} onChange={handleInputChange} className={styles.input} required />
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

          {/* Areas of Expertise */}
          <div className={styles.sectionTitle}>Areas of Expertise</div>
          <div className={styles.checkboxGrid}>
            {areasOfExpertiseOptions.map(area => (
              <label key={area} className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={formData.areasOfExpertise.includes(area)}
                  onChange={() => handleCheckboxChange('areasOfExpertise', area)}
                /> {area}
              </label>
            ))}
          </div>

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
