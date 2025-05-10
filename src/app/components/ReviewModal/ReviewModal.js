'use client';

import React, { useState, useEffect } from 'react';
import styles from './ReviewModal.module.css';

const Star = ({ filled, onClick, onMouseEnter, onMouseLeave, starId }) => (
  <span
    className={`${styles.star} ${filled ? styles.filled : ''}`}
    onClick={() => onClick(starId)}
    onMouseEnter={() => onMouseEnter(starId)}
    onMouseLeave={onMouseLeave}
  >
    ★
  </span>
);

const ReviewModal = ({ appointmentId, professionalId, customerId, isOpen, onClose, onSubmitReview }) => {
  const [rating, setRating] = useState(5); // Default to 5 stars
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Reset state when modal opens
      setRating(5);
      setHoverRating(0);
      setComment('');
      setError('');
      setSuccessMessage('');
      setIsLoading(false);
    }
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  const handleStarClick = (starId) => {
    setRating(starId);
  };

  const handleStarMouseEnter = (starId) => {
    setHoverRating(starId);
  };

  const handleStarMouseLeave = () => {
    setHoverRating(0);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const response = await fetch('/api/reviews', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Pass 'x-user-id' header if customerId is available and backend relies on it
          ...(customerId && { 'x-user-id': customerId }),
        },
        body: JSON.stringify({
          appointmentId,
          rating,
          comment,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Error: ${response.status}`);
      }

      setSuccessMessage('Review submitted successfully!');
      if (onSubmitReview) {
        onSubmitReview({ appointmentId, rating, comment, reviewId: data.reviewId });
      }
      // Optionally close modal after a delay or let user close it
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (err) {
      setError(err.message || 'Failed to submit review. Please try again.');
      console.error('Review submission error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.modalContent}>
        <button className={styles.closeButton} onClick={onClose} disabled={isLoading}>×</button>
        <h2>Leave a Review</h2>
        {error && <p className={styles.errorMessage}>{error}</p>}
        {successMessage && <p className={styles.successMessage}>{successMessage}</p>}
        <form onSubmit={handleSubmit}>
          <div className={styles.starsContainer}>
            {[1, 2, 3, 4, 5].map((starId) => (
              <Star
                key={starId}
                starId={starId}
                filled={hoverRating >= starId || (!hoverRating && rating >= starId)}
                onClick={handleStarClick}
                onMouseEnter={handleStarMouseEnter}
                onMouseLeave={handleStarMouseLeave}
              />
            ))}
          </div>
          <p className={styles.ratingText}>{hoverRating || rating} out of 5</p>

          <div className={styles.formGroup}>
            <label htmlFor="comment">Comment (Optional):</label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows="4"
              disabled={isLoading}
            />
          </div>

          <button type="submit" className={styles.submitButton} disabled={isLoading}>
            {isLoading ? 'Submitting...' : 'Submit Review'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ReviewModal;
