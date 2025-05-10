'use client';

import React, { useEffect, useState, Suspense, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import { FaArrowLeft, FaRegBuilding, FaUserTie, FaTrash, FaCalendarAlt } from 'react-icons/fa';
import { toast } from 'react-toastify';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css'; // Default styling
import { useAuth } from '@/context/AuthContext'; // For customerId

// Helper to generate unique IDs for service instances
const generateUniqueId = () => `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Helper to format date to YYYY-MM-DD
const formatDateToYYYYMMDD = (date) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to format HH:MM time to AM/PM for display
// Assumes timeString is already in local HH:MM format
const formatToAmPm = (timeString) => {
  if (!timeString || !/^\d{2}:\d{2}$/.test(timeString)) return 'N/A';
  const [hours, minutes] = timeString.split(':');
  const h = parseInt(hours, 10);
  const m = parseInt(minutes, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedHours = h % 12 || 12; // Convert 0 to 12 for 12 AM
    return `${formattedHours}:${String(m).padStart(2, '0')} ${ampm}`;
};

// Helper to convert UTC HH:MM to local HH:MM based on a timezone
const convertFromUTCHHMm = (utcTimeString, timezone) => {
  if (!utcTimeString || !timezone || !/^\d{2}:\d{2}$/.test(utcTimeString)) return utcTimeString; // Return original if invalid
  try {
    const [hours, minutes] = utcTimeString.split(':').map(Number);
    // Create a date object for today in UTC with the given time
    const today = new Date();
    const utcDate = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), hours, minutes));
    
    // Format this UTC date into the target timezone
    const localTimeFormatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // Get HH:MM format
    });
    return localTimeFormatter.format(utcDate);
  } catch (error) {
    console.error("Error converting from UTC HH:mm to local:", error);
    return utcTimeString; // Fallback to original UTC time string
  }
};

// Helper function to format a slot with start and end time based on duration
const formatSlotWithDuration = (utcSlotStartTime, durationMinutes, timezone) => {
  if (!utcSlotStartTime || durationMinutes <= 0 || !timezone) {
    return formatToAmPm(convertFromUTCHHMm(utcSlotStartTime, timezone)) || utcSlotStartTime; // Fallback
  }

  try {
    // Get local start time
    const localStartTimeHHMM = convertFromUTCHHMm(utcSlotStartTime, timezone);
    const formattedLocalStartTime = formatToAmPm(localStartTimeHHMM);

    // Calculate UTC end time
    const [startHoursUTC, startMinutesUTC] = utcSlotStartTime.split(':').map(Number);
    const tempDate = new Date(); // Use a temporary date object
    tempDate.setUTCHours(startHoursUTC, startMinutesUTC, 0, 0); // Set time in UTC
    
    const utcEndDate = new Date(tempDate.getTime() + durationMinutes * 60000);
    
    const endHoursUTC = utcEndDate.getUTCHours();
    const endMinutesUTC = utcEndDate.getUTCMinutes();
    const utcEndTimeString = `${String(endHoursUTC).padStart(2, '0')}:${String(endMinutesUTC).padStart(2, '0')}`;

    // Get local end time
    const localEndTimeHHMM = convertFromUTCHHMm(utcEndTimeString, timezone);
    const formattedLocalEndTime = formatToAmPm(localEndTimeHHMM);

    return `${formattedLocalStartTime} - ${formattedLocalEndTime}`;
  } catch (error) {
    console.error("Error formatting slot with duration:", error);
    // Fallback to just showing start time if an error occurs
    return formatToAmPm(convertFromUTCHHMm(utcSlotStartTime, timezone)) || utcSlotStartTime;
  }
};


function GenerateQuoteContent() {
  const { user: currentUser } = useAuth(); // Get current user for customerId
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [professional, setProfessional] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedServices, setSelectedServices] = useState([]);
  const [generatedQuote, setGeneratedQuote] = useState(null);
  const [totalServiceDurationMinutes, setTotalServiceDurationMinutes] = useState(0);

  // Appointment booking states
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [selectedDate, setSelectedDate] = useState(tomorrow);
  const [availableSlots, setAvailableSlots] = useState([]); // Stores UTC slots from API
  const [professionalTimezone, setProfessionalTimezone] = useState(null); // Initialize to null
  const [selectedSlot, setSelectedSlot] = useState(null); // Stores the selected UTC slot string
  const [customerNotes, setCustomerNotes] = useState('');
  const [isLoadingSlots, setIsLoadingSlots] = useState(false);
  const [isBooking, setIsBooking] = useState(false);


  useEffect(() => {
    if (id) {
      const fetchProfessionalDetails = async () => {
        setLoading(true);
        setError('');
        try {
          const response = await fetch(`/api/professionals/${id}`);
          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Failed to fetch professional details.');
          }
          const data = await response.json();
          setProfessional(data);
          if (data.timezone) { // Assuming professional object has a timezone field
            setProfessionalTimezone(data.timezone);
          }
        } catch (err) {
          setError(err.message);
          toast.error(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchProfessionalDetails();
    } else {
      setError('Professional ID not found.');
      setLoading(false);
      toast.error('Professional ID not found.');
    }
  }, [id]);

  // Calculate total service duration whenever selectedServices changes
  useEffect(() => {
    const totalDuration = selectedServices.reduce((sum, service) => {
      return sum + (Number(service.duration) || 0);
    }, 0);
    setTotalServiceDurationMinutes(totalDuration);
    
    // If no services are selected, clear the quote.
    if (selectedServices.length === 0) {
        setGeneratedQuote(null);
    }
    // Always clear slots and selected slot when services change, as duration might affect availability.
    setAvailableSlots([]);
    setSelectedSlot(null);
  }, [selectedServices]);

  const fetchAvailableSlots = useCallback(async (dateToFetch, duration) => {
    if (!id || !dateToFetch || duration <= 0) {
      setAvailableSlots([]);
      return;
    }
    setIsLoadingSlots(true);
    setAvailableSlots([]); // Clear previous slots
    setSelectedSlot(null); // Clear selected slot
    try {
      const formattedDate = formatDateToYYYYMMDD(dateToFetch);
      const response = await fetch(`/api/professionals/${id}/available-slots?date=${formattedDate}&serviceDuration=${duration}`);
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.message || 'Failed to fetch available slots.');
      }
      const data = await response.json();
      setAvailableSlots(data.availableSlots || []);
      if (data.professionalTimezone) {
        setProfessionalTimezone(data.professionalTimezone);
      }
    } catch (err) {
      toast.error(err.message);
      setAvailableSlots([]);
    } finally {
      setIsLoadingSlots(false);
    }
  }, [id]); // `id` is a dependency

  // Fetch slots when selectedDate or totalServiceDurationMinutes (if quote exists) changes
  useEffect(() => {
    if (generatedQuote && selectedDate && totalServiceDurationMinutes > 0) {
      fetchAvailableSlots(selectedDate, totalServiceDurationMinutes);
    } else {
      setAvailableSlots([]); // Clear slots if no quote or duration is zero
      setSelectedSlot(null);
    }
  }, [selectedDate, totalServiceDurationMinutes, generatedQuote, fetchAvailableSlots]);


  const handleDateChange = (date) => {
    setSelectedDate(date);
    // fetchAvailableSlots will be called by the useEffect above
  };

  const handleSlotSelect = (slot) => {
    setSelectedSlot(slot);
  };

  const handleRequestAppointment = async () => {
    if (!currentUser) {
      toast.error("Please sign in to request an appointment.");
      // router.push('/signin'); // Optionally redirect to signin
      return;
    }
    if (!generatedQuote || !selectedSlot || !professional || !id) {
      toast.error("Missing information to request appointment. Please select a service, generate a quote, pick a date and slot.");
      return;
    }

    setIsBooking(true);
    const appointmentData = {
      customerId: currentUser._id,
      professionalId: id,
      services: selectedServices.map(s => ({
        name: s.serviceName,
        price: s.rate, // Assuming rate is the price per service for the quote context
        duration: s.duration,
      })),
      totalDuration: totalServiceDurationMinutes,
      appointmentDate: formatDateToYYYYMMDD(selectedDate),
      startTime: selectedSlot, // This is local to professional, API will handle UTC conversion if needed
      professionalTimezone: professionalTimezone, // Send professional's timezone
      quotedPrice: parseFloat(generatedQuote.finalAmount),
      customerNotes: customerNotes,
    };

    try {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${currentUser.token}` /* Assuming token is on user object */ },
        body: JSON.stringify(appointmentData),
      });
      const result = await response.json();
      if (!response.ok) {
        throw new Error(result.message || "Failed to request appointment.");
      }
      toast.success("Appointment requested successfully! The professional will review and confirm.");
      // Reset relevant states
      setGeneratedQuote(null);
      setSelectedServices([]);
      setSelectedDate(new Date());
      setAvailableSlots([]);
      setSelectedSlot(null);
      setCustomerNotes('');
      // Optionally, redirect to dashboard or an appointments page
      router.push('/dashboard'); 
    } catch (err) {
      toast.error(`Error requesting appointment: ${err.message}`);
    } finally {
      setIsBooking(false);
    }
  };

  const handleAddService = () => {
    if (!professional?.servicesOffered || professional.servicesOffered.length === 0) {
      toast.warn("This professional currently offers no services to select.");
      return;
    }
    const firstService = professional.servicesOffered[0];
    setSelectedServices([
      ...selectedServices,
      {
        id: generateUniqueId(),
        serviceName: firstService?.name || "Unknown Service", 
        rate: firstService?.hourlyRate !== undefined ? firstService.hourlyRate : 0,
        duration: firstService?.duration || 60, // Add duration, default 60 mins
        transactions: '',
        bankReconciliation: 'no',
        financialStatements: 'no',
      },
    ]);
  };

  const handleServiceChange = (instanceId, field, value) => {
    setSelectedServices(
      selectedServices.map(s => {
        if (s.id === instanceId) {
          if (field === 'serviceName') {
            const selectedServiceDetail = professional.servicesOffered.find(pSvc => pSvc.name === value);
            return { 
              ...s, 
              serviceName: value, 
              rate: selectedServiceDetail?.hourlyRate !== undefined ? selectedServiceDetail.hourlyRate : 0,
              duration: selectedServiceDetail?.duration || s.duration // Update duration, keep old if new one not found
            };
          }
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  const handleRemoveService = (instanceId) => {
    setSelectedServices(selectedServices.filter(s => s.id !== instanceId));
    // If removing a service clears the quote, also clear appointment related states
    if (selectedServices.length === 1) { // about to become 0
        setGeneratedQuote(null);
        setAvailableSlots([]);
        setSelectedSlot(null);
        setCustomerNotes('');
    }
  };

  const calculateQuote = () => {
    if (selectedServices.length === 0) {
      toast.error("Please add at least one service to generate a quote.");
      setGeneratedQuote(null); // Clear previous quote if services are removed
      setAvailableSlots([]);
      setSelectedSlot(null);
      return;
    }

    let totalBaseCost = 0;
    let totalIndividualComplexityScore = 0;

    selectedServices.forEach(service => {
      totalBaseCost += Number(service.rate) || 0;

      let individualServiceComplexity = 0;
      const transactions = parseInt(service.transactions, 10);
      if (!isNaN(transactions)) {
        if (transactions > 500) individualServiceComplexity += 0.4;
        else if (transactions > 200) individualServiceComplexity += 0.2;
        else if (transactions > 50) individualServiceComplexity += 0.1;
      }

      if (service.bankReconciliation === 'yes') individualServiceComplexity += 0.15;
      if (service.financialStatements === 'yes') individualServiceComplexity += 0.25;
      
      totalIndividualComplexityScore += individualServiceComplexity;
    });

    const averageComplexityContribution = selectedServices.length > 0 ? totalIndividualComplexityScore / selectedServices.length : 0;
    const overallComplexityFactor = 1.0 + averageComplexityContribution;
    
    const finalQuote = totalBaseCost * overallComplexityFactor;

    const complexityAmount = totalBaseCost * averageComplexityContribution;

    setGeneratedQuote({
      totalBaseCost: totalBaseCost.toFixed(2),
      averageComplexityPercentage: (averageComplexityContribution * 100).toFixed(0),
      complexityAmount: complexityAmount.toFixed(2),
      finalAmount: finalQuote.toFixed(2),
      numberOfServices: selectedServices.length,
      overallFactor: overallComplexityFactor.toFixed(2) // Keep for reference if needed
    });
    toast.success("Quote generated!");
  };


  if (loading) return <div className={styles.loading}>Loading...</div>;
  if (error) return <div className={styles.error}>Error: {error} <Link href={`/professional/${id}`}>Back to Profile</Link></div>;
  if (!professional) return <div className={styles.error}>Professional details not found.</div>;

  return (
    <div className={styles.pageContainer}>
      <div className={styles.quoteFormLayout}>
        <div className={styles.navigationHeader}>
          <button onClick={() => router.back()} className={styles.backButton}>
            <FaArrowLeft /> Back
          </button>
        </div>

        <header className={styles.professionalHeader}>
          <h1 className={styles.professionalName}>{professional.name || 'N/A'}</h1>
          {professional.businessName && <p className={styles.businessName}><FaRegBuilding /> {professional.businessName}</p>}
        </header>

        <h2 className={styles.sectionTitle}>Configure Services for Quote</h2>

        {selectedServices.map((serviceInstance, index) => (
          <div key={serviceInstance.id} className={styles.serviceBlock}>
            <div className={styles.serviceBlockHeader}>
              <h3 className={styles.serviceBlockTitle}>Service {index + 1}</h3>
              <button onClick={() => handleRemoveService(serviceInstance.id)} className={styles.removeServiceButton}><FaTrash /> Remove</button>
            </div>
            
            <div className={styles.inputGroup}>
              <label htmlFor={`serviceName-${serviceInstance.id}`} className={styles.label}>Service Type:</label>
              <select
                id={`serviceName-${serviceInstance.id}`}
                className={styles.select}
                value={serviceInstance.serviceName}
                onChange={(e) => handleServiceChange(serviceInstance.id, 'serviceName', e.target.value)}
              >
                {(professional.servicesOffered || []).map((profService, index) => ( // Use servicesOffered
                  <option key={profService.name || `service-${index}`} value={profService.name || ''}>
                    {profService.name || 'Unknown Service'} ({profService.hourlyRate !== undefined ? `$${profService.hourlyRate}/hr` : 'Rate N/A'})
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.inputGroup}>
              <label htmlFor={`transactions-${serviceInstance.id}`} className={styles.label}>Estimated number of monthly transactions?</label>
              <input
                type="number"
                id={`transactions-${serviceInstance.id}`}
                className={styles.input}
                value={serviceInstance.transactions}
                onChange={(e) => handleServiceChange(serviceInstance.id, 'transactions', e.target.value)}
                placeholder="e.g., 150"
              />
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Do you require bank reconciliation?</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input type="radio" name={`bankReconciliation-${serviceInstance.id}`} value="yes" checked={serviceInstance.bankReconciliation === 'yes'} onChange={(e) => handleServiceChange(serviceInstance.id, 'bankReconciliation', e.target.value)} /> Yes
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" name={`bankReconciliation-${serviceInstance.id}`} value="no" checked={serviceInstance.bankReconciliation === 'no'} onChange={(e) => handleServiceChange(serviceInstance.id, 'bankReconciliation', e.target.value)} /> No
                </label>
              </div>
            </div>

            <div className={styles.inputGroup}>
              <label className={styles.label}>Do you require financial statement preparation?</label>
              <div className={styles.radioGroup}>
                <label className={styles.radioLabel}>
                  <input type="radio" name={`financialStatements-${serviceInstance.id}`} value="yes" checked={serviceInstance.financialStatements === 'yes'} onChange={(e) => handleServiceChange(serviceInstance.id, 'financialStatements', e.target.value)} /> Yes
                </label>
                <label className={styles.radioLabel}>
                  <input type="radio" name={`financialStatements-${serviceInstance.id}`} value="no" checked={serviceInstance.financialStatements === 'no'} onChange={(e) => handleServiceChange(serviceInstance.id, 'financialStatements', e.target.value)} /> No
                </label>
              </div>
            </div>
          </div>
        ))}

        <button onClick={handleAddService} className={styles.addServiceButton}>
          + Add Service
        </button>

        {selectedServices.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button onClick={calculateQuote} className={styles.generateQuoteButton}>
              Generate Quote
            </button>
          </div>
        )}

        {generatedQuote && (
          <div className={styles.quoteResult}>
            <h3>Estimated Quote Breakdown</h3>
            <div className={styles.quoteBreakdownItem}>
              <span>Total Base Service Rates:</span>
              <span>${generatedQuote.totalBaseCost}</span>
            </div>
            <div className={styles.quoteBreakdownItem}>
              <span>Complexity Adjustment ({generatedQuote.averageComplexityPercentage}% of Base):</span>
              <span>+ ${generatedQuote.complexityAmount}</span>
            </div>
            <hr className={styles.quoteDivider} />
            <div className={`${styles.quoteBreakdownItem} ${styles.quoteTotal}`}>
              <span><strong>Estimated Total:</strong></span>
              <span><strong>${generatedQuote.finalAmount}</strong></span>
            </div>
            <small className={styles.quoteFinePrint}>
              Based on {generatedQuote.numberOfServices} service(s). Overall complexity factor: {generatedQuote.overallFactor}.
            </small>
          </div>
        )}

        {/* Appointment Booking Section - Moved outside and below quoteResult if quote is generated */}
        {generatedQuote && (
          <div className={styles.appointmentSection}>
            <h2 className={styles.sectionTitle}><FaCalendarAlt /> Book Your Appointment</h2> {/* Changed to h2 for consistency */}
            <div className={styles.calendarContainer}>
                <Calendar
                  onChange={handleDateChange}
                  value={selectedDate}
                  minDate={tomorrow} // Disable past dates, including today
                  tileDisabled={({ date, view }) => {
                    // Disable today explicitly if minDate logic isn't sufficient for styling or other checks
                    const today = new Date();
                    today.setHours(0, 0, 0, 0); // Normalize today to start of day
                    return view === 'month' && date.getTime() === today.getTime();
                  }}
                />
              </div>

              {isLoadingSlots && <p className={styles.loadingSlots}>Loading available slots...</p>}
              
              {!isLoadingSlots && generatedQuote && totalServiceDurationMinutes > 0 && availableSlots.length > 0 && (
                <div className={styles.slotsContainer}>
                  <h4>Available Slots for {selectedDate.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}:</h4>
                  <div className={styles.slotButtons}>
                    {availableSlots.map(slot => (
                      <button
                        key={slot} // slot is UTC HH:MM
                        onClick={() => handleSlotSelect(slot)}
                        className={`${styles.slotButton} ${selectedSlot === slot ? styles.selectedSlotButton : ''}`}
                      >
                        {professionalTimezone && totalServiceDurationMinutes > 0 
                          ? formatSlotWithDuration(slot, totalServiceDurationMinutes, professionalTimezone)
                          : (professionalTimezone ? formatToAmPm(convertFromUTCHHMm(slot, professionalTimezone)) : slot)}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!isLoadingSlots && generatedQuote && totalServiceDurationMinutes > 0 && availableSlots.length === 0 && professionalTimezone && (
                 <p className={styles.noSlots}>
                    {selectedDate ? 'No slots available for this date or the selected services exceed available time blocks. Please try another date or adjust services.' : 'Please select a date to see available slots.'}
                 </p>
              )}
              {!isLoadingSlots && generatedQuote && totalServiceDurationMinutes > 0 && !professionalTimezone && (
                <p className={styles.noSlots}>Loading professional timezone information to display slots...</p>
              )}


              {generatedQuote && selectedSlot && (
                <div className={styles.notesAndBookContainer}>
                  <div className={styles.inputGroup}>
                    <label htmlFor="customerNotes" className={styles.label}>Notes for the Professional (Optional):</label>
                    <textarea
                      id="customerNotes"
                      value={customerNotes}
                      onChange={(e) => setCustomerNotes(e.target.value)}
                      className={styles.textarea}
                      rows="3"
                      placeholder="e.g., specific questions, preferred contact method"
                    />
                  </div>
                  <button 
                    onClick={handleRequestAppointment} 
                    className={styles.requestAppointmentButton}
                    disabled={isBooking || !currentUser}
                  >
                    {isBooking ? 'Requesting...' : (currentUser ? 'Request Appointment' : 'Sign in to Request')}
                  </button>
                  {!currentUser && <p className={styles.signInPrompt}>You need to be signed in to request an appointment.</p>}
                </div>
              )}
            </div>
        )}
      </div> {/* End of quoteFormLayout */}
    </div> /* End of pageContainer */
  );
}


// formatToAmPm is already defined at the top level of the module.

export default function GenerateQuotePage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading page...</div>}>
      <GenerateQuoteContent />
    </Suspense>
  );
}
