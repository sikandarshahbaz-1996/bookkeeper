'use client';

import React, { useState, useEffect, useCallback } from 'react';
import styles from './page.module.css';
import { useAuth } from '@/context/AuthContext';
import withAuth from '@/components/withAuth';
import { toast } from 'react-toastify';

// Re-use placeholder data for options if needed for editing (e.g., checkboxes)
// Ideally, fetch these from a config or API
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


function DashboardPage() {
  const { token, logout, user: authUser } = useAuth(); // Get authUser for initial state if needed
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' or 'business'
  const [profileData, setProfileData] = useState(null);
  const [editData, setEditData] = useState(null); // State for profile form data while editing
  const [isEditing, setIsEditing] = useState(false); // For profile editing
  const [editBusinessData, setEditBusinessData] = useState(null); // State for business form data
  const [isEditingBusiness, setIsEditingBusiness] = useState(false); // For business info editing
  const [isLoading, setIsLoading] = useState(true); // Loading profile initially
  const [isSaving, setIsSaving] = useState(false); // Saving state (can be used for both profile and business)
  const [error, setError] = useState('');

  // Fetch profile data
  const fetchProfile = useCallback(async () => {
    if (!token) {
      setError('Authentication token not found.');
      setIsLoading(false);
      logout(); // Logout if no token
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      const response = await fetch('/api/user/profile', {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch profile data.');
      setProfileData(data.user);
      setEditData(data.user); // Initialize profile edit form data
      // Initialize business edit form data - assuming business fields might be nested or top-level
      setEditBusinessData({
        businessName: data.user.businessName || '',
        businessAddress: data.user.businessAddress || '',
        businessPhone: data.user.businessPhone || '',
        businessEmail: data.user.businessEmail || '',
      });
    } catch (err) {
      setError(err.message);
      toast.error(`Error fetching profile: ${err.message}`);
      if (err.message.includes('Invalid or expired token')) logout();
    } finally {
      setIsLoading(false);
    }
  }, [token, logout]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]); // Fetch on mount

  // Handlers for edit mode form
  const handleEditInputChange = (e) => {
    const { name, value } = e.target;
    setEditData(prev => ({ ...prev, [name]: value }));
  };

  const handleEditCheckboxChange = (listName, value) => {
    setEditData(prev => {
      const currentList = prev[listName] || [];
      const newList = currentList.includes(value)
        ? currentList.filter(item => item !== value)
        : [...currentList, value];
      return { ...prev, [listName]: newList };
    });
  };
  
  // Handlers for dynamic list editing (Qualifications, Experience)
  const handleEditDynamicListChange = (listName, index, value) => {
    setEditData(prev => {
        const newList = [...(prev[listName] || [])];
        newList[index] = value;
        return { ...prev, [listName]: newList };
    });
  };
  const addEditDynamicListItem = (listName) => {
     setEditData(prev => ({
      ...prev,
      [listName]: [...(prev[listName] || []), '']
    }));
  };
  const removeEditDynamicListItem = (listName, index) => {
     setEditData(prev => {
        const newList = [...(prev[listName] || [])];
        if (newList.length > 0) { // Allow removing the last item in edit mode
            newList.splice(index, 1);
        }
        return { ...prev, [listName]: newList };
    });
  };


  const handleSaveChanges = async () => {
    if (!token || !editData) return;
    setIsSaving(true);
    setError('');
    
    // Filter out empty strings from dynamic lists before saving
    const payload = {
        ...editData,
        qualifications: editData.qualifications?.filter(q => q.trim() !== '') || [],
        experience: editData.experience?.filter(exp => exp.trim() !== '') || [],
    };
    // Remove fields that shouldn't be sent in PUT (like _id, email, role etc.)
    delete payload._id; 
    delete payload.email; 
    delete payload.role; 
    delete payload.createdAt; 
    delete payload.updatedAt; 
    delete payload.isVerified; 

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update profile.');
      
      setProfileData(data.user); // Update displayed data
      setEditData(data.user);   // Reset edit data to saved state
      setIsEditing(false);      // Exit edit mode
      toast.success('Profile updated successfully!');

    } catch (err) {
      setError(err.message);
      toast.error(`Error updating profile: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelEdit = () => {
    setEditData(profileData); // Reset profile edit form data
    setIsEditing(false);
    setError('');
  };

  // Handlers for Business Info Edit Mode
  const handleBusinessInputChange = (e) => {
    const { name, value } = e.target;
    setEditBusinessData(prev => ({ ...prev, [name]: value }));
  };

  const handleSaveBusinessChanges = async () => {
    if (!token || !editBusinessData) return;
    setIsSaving(true);
    setError('');

    // Prepare payload for business info
    const businessPayload = { ...editBusinessData };
    // Ensure only defined fields are sent, or fields the API expects for business info.
    // The API will filter based on `allowedUpdates`, but good practice to send clean data.
    // For example, if API expects these under a 'businessInfo' object, structure accordingly.
    // For now, sending them as top-level properties as per current API modification.

    try {
      const response = await fetch('/api/user/profile', { 
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(businessPayload), // Send only business-related data
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update business information.');

      // API should return the updated user object, which includes business info
      setProfileData(data.user); 
      // Update editBusinessData to reflect the saved state from the potentially modified data.user
      setEditBusinessData({
        businessName: data.user.businessName || '',
        businessAddress: data.user.businessAddress || '',
        businessPhone: data.user.businessPhone || '',
        businessEmail: data.user.businessEmail || '',
      });
      setIsEditingBusiness(false); 
      toast.success(data.message || 'Business information updated successfully!');

    } catch (err) {
      setError(err.message);
      toast.error(`Error updating business information: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelBusinessEdit = () => {
    // Reset business edit form data to original or last saved business data from profileData
    setEditBusinessData({
        businessName: profileData.businessName || '',
        businessAddress: profileData.businessAddress || '',
        businessPhone: profileData.businessPhone || '',
        businessEmail: profileData.businessEmail || '',
    });
    setIsEditingBusiness(false);
    setError('');
  };

  // Render loading state
  if (isLoading) return <div className={styles.container}><p>Loading dashboard...</p></div>;
  // Render error state (only if profileData is null after loading)
  if (!profileData && !isLoading) return <div className={styles.container}><p className={styles.errorMessage}>Error: {error || 'Could not load profile data.'}</p></div>;
  // Ensure profileData exists before rendering main content
  if (!profileData) return null; 

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tabButton} ${activeTab === 'profile' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          Profile
        </button>
        <button
          className={`${styles.tabButton} ${activeTab === 'business' ? styles.activeTab : ''}`}
          onClick={() => setActiveTab('business')}
        >
          Business
        </button>
      </div>

      {activeTab === 'profile' && (
        <div className={styles.profileSection}>
          <div className={styles.profileHeader}>
              <h2>Welcome, {isEditing ? editData.name : profileData.name}!</h2>
              {!isEditing ? (
                   <button className={styles.editButton} onClick={() => setIsEditing(true)}>
                      Edit Profile
                   </button>
              ) : (
                  <div className={styles.editActions}>
                      <button className={styles.saveButton} onClick={handleSaveChanges} disabled={isSaving}>
                          {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                       <button className={styles.cancelButton} onClick={handleCancelEdit} disabled={isSaving}>
                          Cancel
                      </button>
                  </div>
              )}
          </div>

          {/* Display basic info */}
          <div className={styles.infoBlock}>
            <h3>Basic Information</h3>
            {/* Use formRow structure for consistency */}
            <div className={styles.formRow}>
               <label><strong>Email:</strong></label>
               <span>{profileData.email}</span>
            </div>
             <div className={styles.formRow}>
               <label><strong>Role:</strong></label>
               <span>{profileData.role}</span>
            </div>
            <div className={styles.formRow}>
              <label htmlFor="name"><strong>Name:</strong></label>
              {isEditing ? (
                <input type="text" id="name" name="name" value={editData.name || ''} onChange={handleEditInputChange} className={styles.input} />
              ) : (
                <span>{profileData.name}</span>
              )}
            </div>
             <div className={styles.formRow}>
              <label htmlFor="phoneNumber"><strong>Phone:</strong></label>
              {isEditing ? (
                <input type="tel" id="phoneNumber" name="phoneNumber" value={editData.phoneNumber || ''} onChange={handleEditInputChange} className={styles.input} />
              ) : (
                <span>{profileData.phoneNumber || 'N/A'}</span>
              )}
            </div>
          </div>

          {/* Display/Edit professional info only if role is professional */}
          {profileData.role === 'professional' && (
            <>
              <div className={styles.infoBlock}>
                <h3>Qualifications</h3>
                {isEditing ? (
                  <div>
                    {(editData.qualifications || []).map((q, index) => (
                      <div key={`qual-edit-${index}`} className={styles.dynamicInputGroup}>
                        <input type="text" value={q} onChange={(e) => handleEditDynamicListChange('qualifications', index, e.target.value)} className={styles.input} placeholder={`Qualification ${index + 1}`} />
                        <button type="button" onClick={() => removeEditDynamicListItem('qualifications', index)} className={styles.removeButtonSmall}>&ndash;</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addEditDynamicListItem('qualifications')} className={styles.addButtonSmall}>+ Add Qualification</button>
                  </div>
                ) : (
                  profileData.qualifications?.length > 0 ? <ul>{profileData.qualifications.map((q, i) => <li key={i}>{q}</li>)}</ul> : <p>N/A</p>
                )}
              </div>

              <div className={styles.infoBlock}>
                <h3>Experience</h3>
                 {isEditing ? (
                  <div>
                    {(editData.experience || []).map((exp, index) => (
                       <div key={`exp-edit-${index}`} className={styles.dynamicInputGroup}>
                        <input type="text" value={exp} onChange={(e) => handleEditDynamicListChange('experience', index, e.target.value)} className={styles.input} placeholder={`Experience ${index + 1}`} />
                        <button type="button" onClick={() => removeEditDynamicListItem('experience', index)} className={styles.removeButtonSmall}>&ndash;</button>
                      </div>
                    ))}
                    <button type="button" onClick={() => addEditDynamicListItem('experience')} className={styles.addButtonSmall}>+ Add Experience</button>
                  </div>
                ) : (
                   profileData.experience?.length > 0 ? <ul>{profileData.experience.map((e, i) => <li key={i}>{e}</li>)}</ul> : <p>N/A</p>
                )}
              </div>

              <div className={styles.infoBlock}>
                <h3>Areas of Expertise</h3>
                 {isEditing ? (
                   <div className={styles.checkboxGrid}>
                      {areasOfExpertiseOptions.map(area => (
                        <label key={area} className={styles.checkboxLabel}>
                          <input type="checkbox" checked={(editData.areasOfExpertise || []).includes(area)} onChange={() => handleEditCheckboxChange('areasOfExpertise', area)} /> {area}
                        </label>
                      ))}
                    </div>
                 ) : (
                   profileData.areasOfExpertise?.length > 0 ? <ul>{profileData.areasOfExpertise.map((a, i) => <li key={i}>{a}</li>)}</ul> : <p>N/A</p>
                 )}
              </div>

              <div className={styles.infoBlock}>
                <h3>Languages Spoken</h3>
                 {isEditing ? (
                   <div className={styles.checkboxGrid}>
                      {languageOptions.map(lang => (
                        <label key={lang} className={styles.checkboxLabel}>
                          <input type="checkbox" checked={(editData.languagesSpoken || []).includes(lang)} onChange={() => handleEditCheckboxChange('languagesSpoken', lang)} /> {lang}
                        </label>
                      ))}
                    </div>
                 ) : (
                   profileData.languagesSpoken?.length > 0 ? <ul>{profileData.languagesSpoken.map((l, i) => <li key={i}>{l}</li>)}</ul> : <p>N/A</p>
                 )}
              </div>

              <div className={styles.infoBlock}>
                <h3>Software Proficiency</h3>
                 {isEditing ? (
                   <div className={styles.checkboxGrid}>
                      {softwareProficiencyOptions.map(software => (
                        <label key={software} className={styles.checkboxLabel}>
                          <input type="checkbox" checked={(editData.softwareProficiency || []).includes(software)} onChange={() => handleEditCheckboxChange('softwareProficiency', software)} /> {software}
                        </label>
                      ))}
                    </div>
                 ) : (
                   profileData.softwareProficiency?.length > 0 ? <ul>{profileData.softwareProficiency.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>N/A</p>
                 )}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'business' && profileData.role === 'professional' && (
        <div className={styles.profileSection}>
          <div className={styles.profileHeader}>
            {/* Removed h2 "Business Information" */}
            {/* Empty div to push button to the right if no title, or adjust styling */}
            <div></div> 
            {!isEditingBusiness ? (
                 <button className={styles.editButton} onClick={() => setIsEditingBusiness(true)}>
                    Edit Business Information
                 </button>
            ) : (
                <div className={styles.editActions}>
                    <button className={styles.saveButton} onClick={handleSaveBusinessChanges} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                     <button className={styles.cancelButton} onClick={handleCancelBusinessEdit} disabled={isSaving}>
                        Cancel
                    </button>
                </div>
            )}
          </div>

          <div className={styles.infoBlock}>
            <h3>Business Details</h3>
            <div className={styles.formRow}>
              <label htmlFor="businessName"><strong>Name:</strong></label>
              {isEditingBusiness ? (
                <input type="text" id="businessName" name="businessName" value={editBusinessData.businessName || ''} onChange={handleBusinessInputChange} className={styles.input} />
              ) : (
                <span>{profileData.businessName || <em className={styles.emptyField}>empty</em>}</span>
              )}
            </div>
            <div className={styles.formRow}>
              <label htmlFor="businessAddress"><strong>Address:</strong></label>
              {isEditingBusiness ? (
                <input type="text" id="businessAddress" name="businessAddress" value={editBusinessData.businessAddress || ''} onChange={handleBusinessInputChange} className={styles.input} />
              ) : (
                <span>{profileData.businessAddress || <em className={styles.emptyField}>empty</em>}</span>
              )}
            </div>
            <div className={styles.formRow}>
              <label htmlFor="businessPhone"><strong>Phone:</strong></label>
              {isEditingBusiness ? (
                <input type="tel" id="businessPhone" name="businessPhone" value={editBusinessData.businessPhone || ''} onChange={handleBusinessInputChange} className={styles.input} />
              ) : (
                <span>{profileData.businessPhone || <em className={styles.emptyField}>empty</em>}</span>
              )}
            </div>
            <div className={styles.formRow}>
              <label htmlFor="businessEmail"><strong>Email:</strong></label>
              {isEditingBusiness ? (
                <input type="email" id="businessEmail" name="businessEmail" value={editBusinessData.businessEmail || ''} onChange={handleBusinessInputChange} className={styles.input} />
              ) : (
                <span>{profileData.businessEmail || <em className={styles.emptyField}>empty</em>}</span>
              )}
            </div>
            {/* Add more business fields here if needed, following the same pattern */}
          </div>
          {/* Add more business-related info blocks as needed */}
        </div>
      )}
    </div>
  );
}

export default withAuth(DashboardPage);
