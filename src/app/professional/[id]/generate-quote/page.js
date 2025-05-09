'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import styles from './page.module.css';
import { FaArrowLeft, FaRegBuilding, FaUserTie, FaTrash } from 'react-icons/fa';
import { toast } from 'react-toastify';

// Helper to generate unique IDs for service instances
const generateUniqueId = () => `service_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

function GenerateQuoteContent() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id;

  const [professional, setProfessional] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const [selectedServices, setSelectedServices] = useState([]);
  const [generatedQuote, setGeneratedQuote] = useState(null);

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
        } catch (err) {
          setError(err.message);
        } finally {
          setLoading(false);
        }
      };
      fetchProfessionalDetails();
    } else {
      setError('Professional ID not found.');
      setLoading(false);
    }
  }, [id]);

  const handleAddService = () => {
    if (!professional?.areasOfExpertise || professional.areasOfExpertise.length === 0) {
      toast.warn("This professional currently offers no services to select.");
      return;
    }
    setSelectedServices([
      ...selectedServices,
      {
        id: generateUniqueId(), // Unique ID for this instance of service selection
        serviceName: professional.areasOfExpertise[0].name, // Default to first service
        rate: professional.areasOfExpertise[0].hourlyRate,
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
            const selectedServiceDetail = professional.areasOfExpertise.find(pSvc => pSvc.name === value);
            return { ...s, serviceName: value, rate: selectedServiceDetail?.hourlyRate || 0 };
          }
          return { ...s, [field]: value };
        }
        return s;
      })
    );
  };

  const handleRemoveService = (instanceId) => {
    setSelectedServices(selectedServices.filter(s => s.id !== instanceId));
  };

  const calculateQuote = () => {
    if (selectedServices.length === 0) {
      toast.error("Please add at least one service to generate a quote.");
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
                {professional.areasOfExpertise.map(profService => (
                  <option key={profService.name} value={profService.name}>
                    {profService.name} (${profService.hourlyRate}/hr)
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
      </div>
    </div>
  );
}

export default function GenerateQuotePage() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading page...</div>}>
      <GenerateQuoteContent />
    </Suspense>
  );
}
