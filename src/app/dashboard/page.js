'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { useAuth } from '@/context/AuthContext';
import withAuth from '@/components/withAuth';
import { toast } from 'react-toastify';
import { useJsApiLoader, Autocomplete } from '@react-google-maps/api';

// Constants
const generalAreasOfExpertiseOptions = [ // For the Profile tab's general skills
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
const serviceDurationOptions = [
  { label: "1 hr", value: 60 },
  { label: "2 hrs", value: 120 },
  { label: "3 hrs", value: 180 },
  { label: "4 hrs", value: 240 },
];
const softwareProficiencyOptions = [
  "QuickBooks Online", "QuickBooks Desktop", "Xero", "FreshBooks", "Zoho Books",
  "Sage Intacct", "NetSuite ERP", "Wave Accounting", "MYOB", "KashFlow",
  "FreeAgent", "SAP Business One", "Microsoft Dynamics 365"
];
// For the Business tab's services with rates
const servicesOfferedSelectOptions = [ 
  { name: "Bookkeeping", minPrice: 45 },
  { name: "Tax Preparation & Filing", minPrice: 95 },
  { name: "Payroll Processing", minPrice: 55 },
  { name: "Financial Statement Preparation", minPrice: 85 },
  { name: "Audit Services", minPrice: 225 },
  { name: "Forensic Accounting", minPrice: 250 },
  { name: "Business Valuation", minPrice: 175 },
  { name: "Management Consulting", minPrice: 150 },
  { name: "Budgeting & Forecasting", minPrice: 100 },
  { name: "Cash Flow Management", minPrice: 115 },
  { name: "IRS Representation", minPrice: 160 },
  { name: "Startup Advisory", minPrice: 120 }
];
const daysOfWeek = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const timeOptions = [];
for (let h = 0; h < 24; h++) {
  for (let m = 0; m < 60; m += 30) {
    timeOptions.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  }
}
let commonTimeZones = [];
try {
  const allTimeZones = Intl.supportedValuesOf('timeZone');
  commonTimeZones = allTimeZones.filter(tz =>
    tz.startsWith('America/') || tz.startsWith('Europe/') || tz.startsWith('Asia/') || tz.startsWith('Australia/') || tz === 'UTC' || tz === 'Etc/UTC'
  );
  commonTimeZones.sort();
} catch (e) {
  console.error("Failed to get timezones using Intl API:", e);
  commonTimeZones = ['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris'];
}

const convertToUTCHHMm = (timeString, timezone) => {
  if (!timeString || !timezone) return null;
  try {
    const [hours, minutes] = timeString.split(':').map(Number);
    const formatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: 'numeric', day: 'numeric' });
    const parts = formatter.formatToParts(new Date());
    const year = parts.find(p => p.type === 'year').value;
    const month = parts.find(p => p.type === 'month').value - 1; // Month is 0-indexed
    const day = parts.find(p => p.type === 'day').value;
    const localDate = new Date(year, month, day, hours, minutes);
    const utcFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: 'UTC', hour: '2-digit', minute: '2-digit', hour12: false });
    const formattedUtcTime = utcFormatter.format(localDate);
    const [utcHours, utcMinutes] = formattedUtcTime.split(':');
    return `${utcHours.padStart(2, '0')}:${utcMinutes.padStart(2, '0')}`;
  } catch (error) { console.error("Error converting to UTC HH:mm:", error); return null; }
};

const convertFromUTCHHMm = (utcTimeString, timezone) => {
  if (!utcTimeString || !timezone) return null;
  try {
    const [hours, minutes] = utcTimeString.split(':').map(Number);
    const today = new Date(); // Use current date to establish a base for conversion
    const utcDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), hours, minutes));
    const localFormatter = new Intl.DateTimeFormat('en-CA', { timeZone: timezone, hour: '2-digit', minute: '2-digit', hour12: false });
    const formattedLocalTime = localFormatter.format(utcDate);
    const [localHours, localMinutes] = formattedLocalTime.split(':');
    return `${localHours.padStart(2, '0')}:${localMinutes.padStart(2, '0')}`;
  } catch (error) { console.error("Error converting from UTC HH:mm:", error); return null; }
};

const formatToAmPm = (timeString) => {
  if (!timeString) return 'N/A';
  try {
    const [hours, minutes] = timeString.split(':');
    const hourNum = parseInt(hours);
    const minNum = parseInt(minutes);
    const date = new Date(); 
    date.setHours(hourNum, minNum, 0, 0);
    return new Intl.DateTimeFormat('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date);
  } catch (error) { console.error("Error formatting time to AM/PM:", error); return 'Invalid Time'; }
};

const formatDuration = (minutes) => {
  const option = serviceDurationOptions.find(opt => opt.value === parseInt(minutes, 10));
  return option ? option.label : `${minutes} min`;
};

// Standalone ProfileContent Component (for "Profile" Tab)
const ProfileContent = ({
  isEditing, setIsEditing, editData, profileData,
  handleEditInputChange, handleSaveChanges, handleCancelEdit,
  handleEditDynamicListChange, addEditDynamicListItem, removeEditDynamicListItem,
  handleEditCheckboxChange, isSaving, // Pass generalAreasOfExpertiseOptions here
  generalAreasOfExpertiseOptions: passedGeneralAreasOfExpertiseOptions 
}) => {
  if (!editData || !profileData) {
    return <div className={styles.profileSection}><p>Loading profile information...</p></div>;
  }
  return (
    <div className={styles.profileSection}>
      <div className={styles.profileHeader}>
        <h2>Welcome, {isEditing ? editData.name : profileData.name}!</h2>
        {!isEditing ? (
          <button className={styles.editButton} onClick={() => setIsEditing(true)}>Edit Profile</button>
        ) : (
          <div className={styles.editActions}>
            <button className={styles.saveButton} onClick={handleSaveChanges} disabled={isSaving}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
            <button className={styles.cancelButton} onClick={handleCancelEdit} disabled={isSaving}>Cancel</button>
          </div>
        )}
      </div>
      <div className={styles.infoBlock}>
        <h3>Basic Information</h3>
        <div className={styles.formRow}><label><strong>Personal Email:</strong></label><span>{profileData.email}</span></div>
        <div className={styles.formRow}><label><strong>Role:</strong></label><span>{profileData.role}</span></div>
        <div className={styles.formRow}>
          <label htmlFor="name"><strong>Name:</strong></label>
          {isEditing ? <input type="text" id="name" name="name" value={editData.name || ''} onChange={handleEditInputChange} className={styles.input} /> : <span>{profileData.name || 'N/A'}</span>}
        </div>
        <div className={styles.formRow}>
          <label htmlFor="phoneNumber"><strong>Phone:</strong></label>
          {isEditing ? <input type="tel" id="phoneNumber" name="phoneNumber" value={editData.phoneNumber || ''} onChange={handleEditInputChange} className={styles.input} /> : <span>{profileData.phoneNumber || 'N/A'}</span>}
        </div>
      </div>
      {profileData.role === 'professional' && (
        <>
          <div className={styles.infoBlock}>
            <h3>Qualifications</h3>
            {isEditing ? (
              <div>
                {(editData.qualifications || []).map((q, index) => (
                  <div key={`qual-edit-${index}`} className={styles.dynamicInputGroup}>
                    <input type="text" value={q} onChange={(e) => handleEditDynamicListChange('qualifications', index, e.target.value)} className={styles.input} placeholder={`Qualification ${index + 1}`} />
                    { (editData.qualifications || []).length > 1 && <button type="button" onClick={() => removeEditDynamicListItem('qualifications', index)} className={styles.removeButtonSmall}>&ndash;</button>}
                  </div>
                ))}
                <button type="button" onClick={() => addEditDynamicListItem('qualifications')} className={styles.addButtonSmall}>+ Add Qualification</button>
              </div>
            ) : (profileData.qualifications?.length > 0 ? <ul>{profileData.qualifications.map((q, i) => <li key={i}>{q}</li>)}</ul> : <p>N/A</p>)}
          </div>
          <div className={styles.infoBlock}>
            <h3>Experience</h3>
            {isEditing ? (
              <div>
                {(editData.experience || []).map((exp, index) => (
                  <div key={`exp-edit-${index}`} className={styles.dynamicInputGroup}>
                    <input type="text" value={exp} onChange={(e) => handleEditDynamicListChange('experience', index, e.target.value)} className={styles.input} placeholder={`Experience ${index + 1}`} />
                     { (editData.experience || []).length > 1 && <button type="button" onClick={() => removeEditDynamicListItem('experience', index)} className={styles.removeButtonSmall}>&ndash;</button>}
                  </div>
                ))}
                <button type="button" onClick={() => addEditDynamicListItem('experience')} className={styles.addButtonSmall}>+ Add Experience</button>
              </div>
            ) : (profileData.experience?.length > 0 ? <ul>{profileData.experience.map((e, i) => <li key={i}>{e}</li>)}</ul> : <p>N/A</p>)}
          </div>
          <div className={styles.infoBlock}>
            <h3>Areas of Expertise</h3>
            {isEditing ? (
              <div className={styles.checkboxGrid}>
                {passedGeneralAreasOfExpertiseOptions.map(area => (<label key={area} className={styles.checkboxLabel}><input type="checkbox" name="areasOfExpertise" value={area} checked={(editData.areasOfExpertise || []).includes(area)} onChange={() => handleEditCheckboxChange('areasOfExpertise', area)} /> {area}</label>))}
              </div>
            ) : (profileData.areasOfExpertise?.length > 0 ? <ul>{profileData.areasOfExpertise.map((a, i) => <li key={i}>{a}</li>)}</ul> : <p>N/A</p>)}
          </div>
          <div className={styles.infoBlock}>
            <h3>Languages Spoken</h3>
            {isEditing ? (
              <div className={styles.checkboxGrid}>
                {languageOptions.map(lang => (<label key={lang} className={styles.checkboxLabel}><input type="checkbox" name="languagesSpoken" value={lang} checked={(editData.languagesSpoken || []).includes(lang)} onChange={() => handleEditCheckboxChange('languagesSpoken', lang)} /> {lang}</label>))}
              </div>
            ) : (profileData.languagesSpoken?.length > 0 ? <ul>{profileData.languagesSpoken.map((l, i) => <li key={i}>{l}</li>)}</ul> : <p>N/A</p>)}
          </div>
          <div className={styles.infoBlock}>
            <h3>Software Proficiency</h3>
            {isEditing ? (
              <div className={styles.checkboxGrid}>
                {softwareProficiencyOptions.map(software => (<label key={software} className={styles.checkboxLabel}><input type="checkbox" name="softwareProficiency" value={software} checked={(editData.softwareProficiency || []).includes(software)} onChange={() => handleEditCheckboxChange('softwareProficiency', software)} /> {software}</label>))}
              </div>
            ) : (profileData.softwareProficiency?.length > 0 ? <ul>{profileData.softwareProficiency.map((s, i) => <li key={i}>{s}</li>)}</ul> : <p>N/A</p>)}
          </div>
        </>
      )}
    </div>
  );
};

const libraries = ['places'];

function DashboardPage() {
  const { token, logout } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');

  const [activeTab, setActiveTab] = useState('profile');
  const [profileData, setProfileData] = useState(null); 
  const [editData, setEditData] = useState(null); 
  
  const [editBusinessData, setEditBusinessData] = useState({
    businessName: '', businessAddress: '', businessPhone: '', businessEmail: '',
    servicesOffered: [], // Will be populated by fetchProfile, including duration
    timezone: 'America/New_York',
    availability: daysOfWeek.map(day => ({ day, isAvailable: !['Saturday', 'Sunday'].includes(day), startTime: "09:00", endTime: "17:00" }))
  });

  const [isEditing, setIsEditing] = useState(false); 
  const [isEditingBusiness, setIsEditingBusiness] = useState(false); 
  
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [serviceRateErrors, setServiceRateErrors] = useState({}); 
  
  const autocompleteRef = useRef(null);
  const { isLoaded, loadError } = useJsApiLoader({ googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY, libraries });

  const fetchProfile = useCallback(async () => {
    if (!token) { setError('Authentication token not found.'); setIsLoading(false); logout(); return; }
    setIsLoading(true); setError('');
    try {
      const response = await fetch('/api/user/profile', { method: 'GET', headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to fetch profile data.');
      
      setProfileData(data.user);
      setEditData({ 
        name: data.user.name || '',
        phoneNumber: data.user.phoneNumber || '',
        qualifications: Array.isArray(data.user.qualifications) ? data.user.qualifications : [''],
        experience: Array.isArray(data.user.experience) ? data.user.experience : [''],
        areasOfExpertise: Array.isArray(data.user.areasOfExpertise) ? data.user.areasOfExpertise : [], 
        languagesSpoken: Array.isArray(data.user.languagesSpoken) ? data.user.languagesSpoken : [],
        softwareProficiency: Array.isArray(data.user.softwareProficiency) ? data.user.softwareProficiency : [],
      });
      
      const userTimezone = data.user.timezone || 'America/New_York';
      const initialServicesOffered = Array.isArray(data.user.servicesOffered) 
        ? data.user.servicesOffered.map(s_api => { 
            const serviceOption = servicesOfferedSelectOptions.find(opt => opt.name === s_api.name);
            return { 
              name: s_api.name, 
              rate: s_api.hourlyRate !== undefined ? String(s_api.hourlyRate) : '', 
              duration: s_api.duration !== undefined ? parseInt(s_api.duration, 10) : 60, // Add duration, default to 60
              minPrice: serviceOption ? serviceOption.minPrice : 0 
            };
          }) 
        : [];

      let initialAvailability = data.user.availability && Array.isArray(data.user.availability) && data.user.availability.length === 7
        ? data.user.availability.map(day => ({ ...day, startTime: day.isAvailable && day.startTime ? convertFromUTCHHMm(day.startTime, userTimezone) : "09:00", endTime: day.isAvailable && day.endTime ? convertFromUTCHHMm(day.endTime, userTimezone) : "17:00" }))
        : daysOfWeek.map(day => ({ day, isAvailable: !['Saturday', 'Sunday'].includes(day), startTime: "09:00", endTime: "17:00" }));
      
      setEditBusinessData({
        businessName: data.user.businessName || '', businessAddress: data.user.businessAddress || '',
        businessPhone: data.user.businessPhone || '', businessEmail: data.user.businessEmail || '',
        servicesOffered: initialServicesOffered, 
        timezone: userTimezone, 
        availability: initialAvailability,
      });

    } catch (err) {
      setError(err.message); toast.error(`Error fetching profile: ${err.message}`);
      if (err.message.includes('Invalid or expired token')) logout();
      setEditData({ name: '', phoneNumber: '', qualifications: [''], experience: [''], areasOfExpertise: [], languagesSpoken: [], softwareProficiency: [] });
      setEditBusinessData({ businessName: '', businessAddress: '', businessPhone: '', businessEmail: '', servicesOffered: [], timezone: 'America/New_York', availability: daysOfWeek.map(day => ({ day, isAvailable: !['Saturday', 'Sunday'].includes(day), startTime: "09:00", endTime: "17:00" })) });
    } finally { setIsLoading(false); }
  }, [token, logout]);

  useEffect(() => { fetchProfile(); }, [fetchProfile]);

  const handleEditInputChange = (e) => { const { name, value } = e.target; setEditData(prev => ({ ...prev, [name]: value })); };
  const handleEditCheckboxChange = (listName, value) => { 
    setEditData(prev => { 
      const currentList = prev[listName] || []; 
      const newList = currentList.includes(value) ? currentList.filter(i => i !== value) : [...currentList, value]; 
      return { ...prev, [listName]: newList }; 
    }); 
  };
  const handleEditDynamicListChange = (listName, index, value) => { setEditData(prev => { const newList = [...(prev[listName] || [])]; newList[index] = value; return { ...prev, [listName]: newList }; }); };
  const addEditDynamicListItem = (listName) => { setEditData(prev => ({ ...prev, [listName]: [...(prev[listName] || []), ''] })); };
  const removeEditDynamicListItem = (listName, index) => { setEditData(prev => { const newList = [...(prev[listName] || [])]; if (newList.length > 1) newList.splice(index, 1); else if (newList.length === 1) newList[0] = ''; return { ...prev, [listName]: newList }; }); };

  const handleSaveChanges = async () => { 
    if (!token || !editData) return; 
    setIsSaving(true); setError('');
    const payload = { 
      name: editData.name,
      phoneNumber: editData.phoneNumber,
      qualifications: (editData.qualifications || []).filter(q => q.trim() !== ''), 
      experience: (editData.experience || []).filter(exp => exp.trim() !== ''),
      areasOfExpertise: editData.areasOfExpertise || [], 
      languagesSpoken: editData.languagesSpoken || [],
      softwareProficiency: editData.softwareProficiency || [],
    };
    try {
      const response = await fetch('/api/user/profile', { method: 'PUT', headers: {'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      const data = await response.json(); 
      if (!response.ok) throw new Error(data.message || 'Failed to update profile.');
      setProfileData(data.user); 
      setEditData({ 
        name: data.user.name || '',
        phoneNumber: data.user.phoneNumber || '',
        qualifications: Array.isArray(data.user.qualifications) ? data.user.qualifications : [''],
        experience: Array.isArray(data.user.experience) ? data.user.experience : [''],
        areasOfExpertise: Array.isArray(data.user.areasOfExpertise) ? data.user.areasOfExpertise : [],
        languagesSpoken: Array.isArray(data.user.languagesSpoken) ? data.user.languagesSpoken : [],
        softwareProficiency: Array.isArray(data.user.softwareProficiency) ? data.user.softwareProficiency : [],
      });
      setIsEditing(false); 
      toast.success('Profile updated successfully!');
    } catch (err) { setError(err.message); toast.error(`Error updating profile: ${err.message}`); } finally { setIsSaving(false); }
  };
  const handleCancelEdit = () => { 
     setEditData({
        name: profileData.name || '',
        phoneNumber: profileData.phoneNumber || '',
        qualifications: Array.isArray(profileData.qualifications) ? profileData.qualifications : [''],
        experience: Array.isArray(profileData.experience) ? profileData.experience : [''],
        areasOfExpertise: Array.isArray(profileData.areasOfExpertise) ? profileData.areasOfExpertise : [],
        languagesSpoken: Array.isArray(profileData.languagesSpoken) ? profileData.languagesSpoken : [],
        softwareProficiency: Array.isArray(profileData.softwareProficiency) ? profileData.softwareProficiency : [],
      });
    setIsEditing(false); setError(''); 
  };

  const handleBusinessInputChange = (e) => { const {name,value}=e.target; setEditBusinessData(prev=>({...prev,[name]:value})); };
  
  const handleBusinessCheckboxChange = (serviceNameFromOption) => {
    setEditBusinessData(prev => {
      const currentServices = prev.servicesOffered || [];
      const existingServiceIndex = currentServices.findIndex(s => s.name === serviceNameFromOption);
      let newServices;
      if (existingServiceIndex > -1) { 
        newServices = currentServices.filter(s => s.name !== serviceNameFromOption); 
        setServiceRateErrors(prevE => { const nE = { ...prevE }; delete nE[serviceNameFromOption]; return nE; }); 
      } else { 
        const serviceOption = servicesOfferedSelectOptions.find(opt => opt.name === serviceNameFromOption);
        newServices = [...currentServices, { name: serviceNameFromOption, rate: '', duration: 60, minPrice: serviceOption ? serviceOption.minPrice : 0 }]; // Add default duration
      }
      return { ...prev, servicesOffered: newServices };
    });
  };

  const handleServiceRateChange = (serviceName, rate) => {
    setEditBusinessData(prev => ({ 
      ...prev, 
      servicesOffered: (prev.servicesOffered || []).map(s => s.name === serviceName ? { ...s, rate } : s)
    }));
    if (isNaN(parseFloat(rate)) && rate !== '') {
        setServiceRateErrors(prevE => ({...prevE, [serviceName]: 'Rate must be a number.'}));
    } else if (serviceRateErrors[serviceName]) {
        setServiceRateErrors(prevE => { const nE = { ...prevE }; delete nE[serviceName]; return nE; });
    }
  };

  const handleServiceDurationChange = (serviceName, duration) => {
    setEditBusinessData(prev => ({
      ...prev,
      servicesOffered: (prev.servicesOffered || []).map(s => s.name === serviceName ? { ...s, duration: parseInt(duration, 10) } : s)
    }));
  };

  const handleSaveBusinessChanges = async () => {
    if (!token || !editBusinessData) return;
    const currentServiceRateErrors = {}; 
    let hasErrors = false;
    
    (editBusinessData.servicesOffered || []).forEach(item => {
      const serviceOption = servicesOfferedSelectOptions.find(opt => opt.name === item.name);
      const minPrice = serviceOption ? serviceOption.minPrice : 0;
      if (item.rate === '' || item.rate === null || isNaN(parseFloat(item.rate))) { 
        currentServiceRateErrors[item.name] = 'Hourly rate must be a valid number.'; 
        hasErrors = true; 
      } else if (parseFloat(item.rate) < minPrice) {
        currentServiceRateErrors[item.name] = `Rate cannot be less than minimum $${minPrice}.`;
        hasErrors = true;
      }
    });

    setServiceRateErrors(currentServiceRateErrors);
    if (hasErrors) { toast.error('Please correct the errors in service rates.'); return; }

    setIsSaving(true); setError('');
    const businessPayload = {
      businessName: editBusinessData.businessName, 
      businessAddress: editBusinessData.businessAddress,
      businessPhone: editBusinessData.businessPhone, 
      businessEmail: editBusinessData.businessEmail,
      servicesOffered: (editBusinessData.servicesOffered || []).map(s => ({ name: s.name, hourlyRate: parseFloat(s.rate), duration: s.duration || 60 })), 
      availability: (editBusinessData.availability || []).map(day => ({ ...day, startTime: day.isAvailable ? convertToUTCHHMm(day.startTime, editBusinessData.timezone) : null, endTime: day.isAvailable ? convertToUTCHHMm(day.endTime, editBusinessData.timezone) : null })),
      timezone: editBusinessData.timezone,
    };
    try {
      const response = await fetch('/api/user/profile', { method: 'PUT', headers: {'Authorization':`Bearer ${token}`,'Content-Type':'application/json'}, body: JSON.stringify(businessPayload) });
      const data = await response.json(); 
      if (!response.ok) throw new Error(data.message || 'Failed to update business information.');
      
      setProfileData(data.user); 
      const savedTimezone = data.user.timezone || editBusinessData.timezone;
      
      const updatedServicesOfferedFromAPI = Array.isArray(data.user.servicesOffered) 
        ? data.user.servicesOffered.map(s_api => {
            const serviceOpt = servicesOfferedSelectOptions.find(opt => opt.name === s_api.name);
            return {
              name: s_api.name,
              rate: s_api.hourlyRate !== null && s_api.hourlyRate !== undefined ? String(s_api.hourlyRate) : '',
              duration: s_api.duration !== undefined ? parseInt(s_api.duration, 10) : 60,
              minPrice: serviceOpt ? serviceOpt.minPrice : 0
            };
          })
        : [];
      const savedAvail = Array.isArray(data.user.availability) ? data.user.availability.map(d=>({...d, startTime:d.isAvailable&&d.startTime?convertFromUTCHHMm(d.startTime,savedTimezone):"09:00", endTime:d.isAvailable&&d.endTime?convertFromUTCHHMm(d.endTime,savedTimezone):"17:00"})) : editBusinessData.availability;
      
      setEditBusinessData({ 
        businessName:data.user.businessName||'', 
        businessAddress:data.user.businessAddress||'',
        businessPhone:data.user.businessPhone||'', 
        businessEmail:data.user.businessEmail||'',
        servicesOffered: updatedServicesOfferedFromAPI, 
        timezone:savedTimezone, 
        availability:savedAvail
      });
      setIsEditingBusiness(false); 
      setServiceRateErrors({}); 
      toast.success(data.message || 'Business information updated successfully!');
    } catch (err) { setError(err.message); toast.error(`Error updating business information: ${err.message}`); } finally { setIsSaving(false); }
  };

  const handleCancelBusinessEdit = () => { 
    const currentTz = profileData?.timezone || 'America/New_York';
    const resetServicesOffered = Array.isArray(profileData?.servicesOffered) 
      ? profileData.servicesOffered.map(s_prof => {
          const serviceOpt = servicesOfferedSelectOptions.find(opt => opt.name === s_prof.name);
          return {
            name: s_prof.name,
            rate: s_prof.hourlyRate !== null && s_prof.hourlyRate !== undefined ? String(s_prof.hourlyRate) : '',
            duration: s_prof.duration !== undefined ? parseInt(s_prof.duration, 10) : 60,
            minPrice: serviceOpt ? serviceOpt.minPrice : 0
          };
        })
      : [];
    const resetAvail = Array.isArray(profileData?.availability) ? profileData.availability.map(d=>({...d, startTime:d.isAvailable&&d.startTime?convertFromUTCHHMm(d.startTime,currentTz):"09:00", endTime:d.isAvailable&&d.endTime?convertFromUTCHHMm(d.endTime,currentTz):"17:00"})) : daysOfWeek.map(day=>({day,isAvailable:!['Saturday','Sunday'].includes(day),startTime:"09:00",endTime:"17:00"}));
    
    setEditBusinessData({
      businessName:profileData?.businessName||'', 
      businessAddress:profileData?.businessAddress||'',
      businessPhone:profileData?.businessPhone||'', 
      businessEmail:profileData?.businessEmail||'',
      servicesOffered: resetServicesOffered, 
      timezone:currentTz, 
      availability:resetAvail
    });
    setIsEditingBusiness(false); setError(''); setServiceRateErrors({});
  };

  const handleTimezoneChange = (e) => { setEditBusinessData(prev => ({ ...prev, timezone: e.target.value })); };
  const handleDayAvailabilityToggle = (dayName) => { setEditBusinessData(prev => ({ ...prev, availability: prev.availability.map(d => d.day===dayName ? {...d, isAvailable:!d.isAvailable} : d)})); };
  const handleTimeChange = (dayName,timeType,value) => { setEditBusinessData(prev => ({ ...prev, availability: prev.availability.map(d => d.day===dayName ? {...d, [timeType]:value} : d)})); };

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search-results?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  if (isLoading || !editData || !profileData || !editBusinessData) return <div className={styles.container}><p>Loading dashboard...</p></div>;

  return (
    <div className={styles.container}>
      {profileData.role === 'customer' && (
        <div className={styles.searchContainer}>
          <form onSubmit={handleSearch} className={styles.searchForm}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for professionals (e.g., by name, service, location)"
              className={styles.searchInput}
            />
            <button type="submit" className={styles.searchButton}>Go</button>
          </form>
        </div>
      )}

      {profileData.role === 'professional' && (
        <div className={styles.tabs}>
          <button className={`${styles.tabButton} ${activeTab === 'profile' ? styles.activeTab : ''}`} onClick={() => setActiveTab('profile')}>Profile</button>
          <button className={`${styles.tabButton} ${activeTab === 'business' ? styles.activeTab : ''}`} onClick={() => setActiveTab('business')}>Business</button>
        </div>
      )}
      {profileData.role === 'professional' ? (
        <>
          {activeTab === 'profile' && (
            <ProfileContent
              isEditing={isEditing} setIsEditing={setIsEditing} editData={editData} profileData={profileData}
              handleEditInputChange={handleEditInputChange} handleSaveChanges={handleSaveChanges} handleCancelEdit={handleCancelEdit}
              handleEditDynamicListChange={handleEditDynamicListChange} addEditDynamicListItem={addEditDynamicListItem} removeEditDynamicListItem={removeEditDynamicListItem}
              handleEditCheckboxChange={handleEditCheckboxChange} isSaving={isSaving} styles={styles}
              generalAreasOfExpertiseOptions={generalAreasOfExpertiseOptions} // Corrected: Pass general options
              languageOptions={languageOptions} softwareProficiencyOptions={softwareProficiencyOptions}
            />
          )}
          {activeTab === 'business' && (
            <div className={styles.profileSection}>
              <div className={styles.profileHeader}>
                <div></div> {/* For spacing */}
                {!isEditingBusiness ? (
                  <button className={styles.editButton} onClick={() => setIsEditingBusiness(true)}>Edit Business Information</button>
                ) : (
                  <div className={styles.editActions}>
                    <button className={styles.saveButton} onClick={handleSaveBusinessChanges} disabled={isSaving}>{isSaving ? 'Saving...' : 'Save Changes'}</button>
                    <button className={styles.cancelButton} onClick={handleCancelBusinessEdit} disabled={isSaving}>Cancel</button>
                  </div>
                )}
              </div>
              <div className={styles.infoBlock}>
                <h3>Business Details</h3>
                <div className={styles.formRow}>
                  <label htmlFor="businessName"><strong>Name:</strong></label>
                  {isEditingBusiness ? <input type="text" id="businessName" name="businessName" value={editBusinessData.businessName || ''} onChange={handleBusinessInputChange} className={styles.input} /> : <span>{profileData.businessName || <em className={styles.emptyField}>empty</em>}</span>}
                </div>
                <div className={styles.formRow}>
                  <label htmlFor="businessAddress"><strong>Address:</strong></label>
                  <div className={styles.inputFieldContainer}>
                    {isEditingBusiness ? (
                      isLoaded ? (
                        <Autocomplete
                          onLoad={(autocomplete) => { autocompleteRef.current = autocomplete; }}
                          onPlaceChanged={() => {
                            if (autocompleteRef.current) {
                              const place = autocompleteRef.current.getPlace();
                              if (place && place.formatted_address) setEditBusinessData(prev => ({ ...prev, businessAddress: place.formatted_address }));
                              else if (place && place.name) setEditBusinessData(prev => ({ ...prev, businessAddress: place.name }));
                            }
                          }}
                        >
                          <input type="text" id="businessAddress" name="businessAddress" placeholder="Start typing your business address" value={editBusinessData.businessAddress || ''} onChange={handleBusinessInputChange} className={styles.input}/>
                        </Autocomplete>
                      ) : <input type="text" id="businessAddress" name="businessAddress" placeholder="Loading address suggestions..." value={editBusinessData.businessAddress || ''} onChange={handleBusinessInputChange} className={styles.input} disabled />
                    ) : (
                      <span>{profileData.businessAddress || <em className={styles.emptyField}>empty</em>}</span>
                    )}
                    {loadError && isEditingBusiness && <p className={styles.inlineError}>Could not load address suggestions.</p>}
                  </div>
                </div>
                <div className={styles.formRow}>
                  <label htmlFor="businessPhone"><strong>Phone:</strong></label>
                  {isEditingBusiness ? <input type="tel" id="businessPhone" name="businessPhone" value={editBusinessData.businessPhone || ''} onChange={handleBusinessInputChange} className={styles.input} /> : <span>{profileData.businessPhone || <em className={styles.emptyField}>empty</em>}</span>}
                </div>
                <div className={styles.formRow}>
                  <label htmlFor="businessEmail"><strong>Business Email:</strong></label>
                  {isEditingBusiness ? <input type="email" id="businessEmail" name="businessEmail" value={editBusinessData.businessEmail || ''} onChange={handleBusinessInputChange} className={styles.input} /> : <span>{profileData.businessEmail || <em className={styles.emptyField}>empty</em>}</span>}
                </div>
              </div>
              <div className={styles.infoBlock}>
                <h3>Services Offered</h3>
                {isEditingBusiness ? (
                  <div className={styles.checkboxGridServices}>
                    {servicesOfferedSelectOptions.map(serviceOption => { 
                      const serviceData = (editBusinessData.servicesOffered || []).find(s => s.name === serviceOption.name); 
                      const isChecked = !!serviceData;
                      return (
                        <div key={serviceOption.name} className={styles.serviceRateItem}>
                          <label className={styles.checkboxLabel}>
                            <input type="checkbox" checked={isChecked} onChange={() => handleBusinessCheckboxChange(serviceOption.name)} /> 
                            {serviceOption.name} (Min. ${serviceOption.minPrice}/hr)
                          </label>
                          {isChecked && (
                            <div className={styles.serviceInputsContainer}> {/* Changed class for better styling potential */}
                              <div className={styles.rateInputContainer}>
                                <label htmlFor={`rate-${serviceOption.name}`} className={styles.inlineLabel}>Rate ($/hr):</label>
                                <input 
                                  type="number" 
                                  id={`rate-${serviceOption.name}`}
                                  placeholder="Your Rate" 
                                  value={serviceData.rate || ''} 
                                  onChange={(e) => handleServiceRateChange(serviceOption.name, e.target.value)} 
                                  className={`${styles.input} ${styles.rateInput}`} 
                                  min={serviceOption.minPrice} 
                                  step="0.01"
                                />
                                {serviceRateErrors[serviceOption.name] && <p className={styles.inlineError}>{serviceRateErrors[serviceOption.name]}</p>}
                              </div>
                              <div className={styles.durationInputContainer}>
                                <label htmlFor={`duration-${serviceOption.name}`} className={styles.inlineLabel}>Duration:</label>
                                <select
                                  id={`duration-${serviceOption.name}`}
                                  value={serviceData.duration || 60}
                                  onChange={(e) => handleServiceDurationChange(serviceOption.name, e.target.value)}
                                  className={`${styles.input} ${styles.durationSelect}`}
                                >
                                  {serviceDurationOptions.map(opt => (
                                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                                  ))}
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : ( 
                  profileData.servicesOffered?.length > 0 ? (
                    <ul className={styles.serviceListDisplay}>
                      {profileData.servicesOffered.map((s, i) => (
                        <li key={i}>
                          {s.name}: {s.hourlyRate != null && s.hourlyRate !== '' ? `$${s.hourlyRate}/hr` : <em className={styles.emptyField}>No rate set</em>}
                          {s.duration ? ` - ${formatDuration(s.duration)}` : ''}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p><em className={styles.emptyField}>No services listed.</em></p>
                  )
                )}
              </div>
              <div className={styles.infoBlock}>
                <h3>Availability</h3>
                {isEditingBusiness ? (
                  <>
                    <div className={styles.formRow}>
                      <label htmlFor="timezone"><strong>Timezone:</strong></label>
                      <select id="timezone" name="timezone" value={editBusinessData.timezone || 'America/New_York'} onChange={handleTimezoneChange} className={styles.input}>
                        {commonTimeZones.map(tz => <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>)}
                      </select>
                    </div>
                    {editBusinessData.availability && editBusinessData.availability.map((daySchedule) => (
                      <div key={daySchedule.day} className={styles.dayAvailabilityRow}>
                        <div className={styles.dayNameContainer}>
                          <input type="checkbox" id={`available-${daySchedule.day}`} checked={daySchedule.isAvailable} onChange={() => handleDayAvailabilityToggle(daySchedule.day)} className={styles.availabilityToggle} />
                          <label htmlFor={`available-${daySchedule.day}`} className={styles.dayLabel}><strong>{daySchedule.day}</strong></label>
                        </div>
                        {daySchedule.isAvailable ? (
                          <div className={styles.timeSelectors}>
                            <select value={daySchedule.startTime} onChange={(e) => handleTimeChange(daySchedule.day, 'startTime', e.target.value)} className={styles.input}>
                              {timeOptions.map(time => <option key={`start-${time}`} value={time}>{formatToAmPm(time)}</option>)}
                            </select>
                            <span>to</span>
                            <select value={daySchedule.endTime} onChange={(e) => handleTimeChange(daySchedule.day, 'endTime', e.target.value)} className={styles.input}>
                              {timeOptions.map(time => <option key={`end-${time}`} value={time}>{formatToAmPm(time)}</option>)}
                            </select>
                          </div>
                        ) : <span className={styles.dayOffText}>Unavailable</span>}
                      </div>
                    ))}
                  </>
                ) : (
                  <>
                    <div className={styles.formRow}><label><strong>Timezone:</strong></label><span>{profileData.timezone ? profileData.timezone.replace(/_/g, ' ') : <em className={styles.emptyField}>Not set</em>}</span></div>
                    <ul>
                      {(profileData.availability || []).map((daySchedule, i) => (
                        <li key={i}><strong>{daySchedule.day}:</strong> {daySchedule.isAvailable ? `${daySchedule.startTime ? formatToAmPm(convertFromUTCHHMm(daySchedule.startTime, profileData.timezone)) : 'N/A'} - ${daySchedule.endTime ? formatToAmPm(convertFromUTCHHMm(daySchedule.endTime, profileData.timezone)) : 'N/A'}` : 'Unavailable'}</li>
                      ))}
                    </ul>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <ProfileContent
          isEditing={isEditing} setIsEditing={setIsEditing} editData={editData} profileData={profileData}
          handleEditInputChange={handleEditInputChange} handleSaveChanges={handleSaveChanges} handleCancelEdit={handleCancelEdit}
          handleEditDynamicListChange={handleEditDynamicListChange} addEditDynamicListItem={addEditDynamicListItem} removeEditDynamicListItem={removeEditDynamicListItem}
          handleEditCheckboxChange={handleEditCheckboxChange} isSaving={isSaving} styles={styles}
          generalAreasOfExpertiseOptions={generalAreasOfExpertiseOptions} // Corrected: Pass general options
          languageOptions={languageOptions} softwareProficiencyOptions={softwareProficiencyOptions}
        />
      )}
    </div>
  );
}

export default withAuth(DashboardPage);
