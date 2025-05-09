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
    servicesOffered: [{ name: '', hourlyRate: '', duration: 60 }], // Initialized with one service item. Duration defaults to 1hr (60 mins).
    languagesSpoken: [],
    softwareProficiency: []
  });

  // Handlers for servicesOffered
  const handleServiceChange = (index, field, value) => {
    const updatedServices = formData.servicesOffered.map((service, i) => {
      if (i === index) {
        return { ...service, [field]: value };
      }
      return service;
    });
    setFormData(prev => ({ ...prev, servicesOffered: updatedServices }));
  };

  const addServiceItem = () => {
    setFormData(prev => ({
      ...prev,
      servicesOffered: [...prev.servicesOffered, { name: '', hourlyRate: '', duration: 60 }]
    }));
  };

  const removeServiceItem = (index) => {
    const updatedServices = formData.servicesOffered.filter((_, i) => i !== index);
    setFormData(prev => ({ ...prev, servicesOffered: updatedServices }));
  };

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

    // Validate servicesOffered
    const processedServices = [];
    for (const service of formData.servicesOffered) {
      const serviceName = service.name ? service.name.trim() : '';
      const hourlyRateStr = service.hourlyRate ? String(service.hourlyRate).trim() : '';

      if (serviceName) { // If a service has a name, it's considered an intentional entry
        if (!hourlyRateStr) {
          toast.error(`Hourly rate is mandatory for service: "${serviceName}".`);
          setLoading(false);
          return;
        }
        const hourlyRate = parseFloat(hourlyRateStr);
        if (isNaN(hourlyRate) || hourlyRate <= 0) {
          toast.error(`A valid positive hourly rate is mandatory for service: "${serviceName}".`);
          setLoading(false);
          return;
        }
        // Duration has a default and is a select, so it should always be valid if a serviceName exists
        if (!service.duration) { 
          toast.error(`Duration is mandatory for service: "${serviceName}".`);
          setLoading(false);
          return;
        }
        processedServices.push({
          name: serviceName,
          hourlyRate: hourlyRate,
          duration: parseInt(service.duration, 10)
        });
      } else if (hourlyRateStr || (service.duration && parseInt(service.duration, 10) !== 60)) {
        // Name is blank, but rate or non-default duration is filled. This is an incomplete service.
        toast.error('One or more services are incomplete. Please provide a name or clear/remove the service entry.');
        setLoading(false);
        return;
      }
      // If serviceName is blank, hourlyRate is blank, and duration is default 60, it's an "empty" template service that will be ignored.
    }
    // End of service validation
    
    // Prepare payload
    const payload = {
      ...formData, 
      role: 'professional',
      qualifications: formData.qualifications.filter(q => q.trim() !== ''),
      experience: formData.experience.filter(exp => exp.trim() !== ''),
      areasOfExpertise: formData.areasOfExpertise.filter(area => area.trim() !== ''),
      servicesOffered: processedServices, 
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

          {/* Services Offered */}
          <div className={styles.sectionTitle}>Services Offered</div>
          {formData.servicesOffered.map((service, index) => (
            <div key={`service-${index}`} className={styles.serviceEntry} style={{ border: '1px solid #eee', padding: '15px', marginBottom: '15px', borderRadius: '5px' }}>
              <div className={styles.inputGroup}>
                <label htmlFor={`serviceName-${index}`} className={styles.label}>Service Name</label>
                <input
                  type="text"
                  id={`serviceName-${index}`}
                  value={service.name}
                  onChange={(e) => handleServiceChange(index, 'name', e.target.value)}
                  className={styles.input}
                  placeholder="e.g., Tax Consultation"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor={`hourlyRate-${index}`} className={styles.label}>Hourly Rate ($)</label>
                <input
                  type="number"
                  id={`hourlyRate-${index}`}
                  value={service.hourlyRate}
                  onChange={(e) => handleServiceChange(index, 'hourlyRate', e.target.value)}
                  className={styles.input}
                  placeholder="e.g., 75"
                  min="0"
                />
              </div>
              <div className={styles.inputGroup}>
                <label htmlFor={`duration-${index}`} className={styles.label}>Service Duration</label>
                <select
                  id={`duration-${index}`}
                  value={service.duration}
                  onChange={(e) => handleServiceChange(index, 'duration', parseInt(e.target.value, 10))}
                  className={styles.input}
                >
                  <option value="60">1 hr</option>
                  <option value="120">2 hrs</option>
                  <option value="180">3 hrs</option>
                  <option value="240">4 hrs</option>
                </select>
              </div>
              <button
                type="button"
                onClick={() => removeServiceItem(index)}
                className={styles.removeButton} 
                style={{ marginTop: '10px', background: '#f44336', color: 'white' }} // Basic styling for remove
              >
                Remove This Service
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={addServiceItem}
            className={styles.addButton} 
            style={{ marginBottom: '20px', background: '#4CAF50', color: 'white' }} // Basic styling for add
          >
            Add Another Service
          </button>

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
