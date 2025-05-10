// Email templates for appointment notifications

const appName = "Bookkeeper App";

// --- Helper to generate a common footer ---
const getEmailFooter = () => `
  <p>Thank you for using ${appName}.</p>
  <p>If you have any questions, please don't hesitate to contact our support team.</p>
  <p>Best regards,<br/>The ${appName} Team</p>
`;

// --- Appointment Created ---
export const getAppointmentCreatedEmail = (appointmentDetails, recipientType) => {
  const { professionalName, customerName, serviceName, appointmentDate, appointmentTime, quote } = appointmentDetails;
  let subject = '';
  let text = '';
  let html = '';

  if (recipientType === 'customer') {
    subject = `Your Appointment Request with ${professionalName} has been Sent!`;
    text = `
      Hello ${customerName},

      Your appointment request for "${serviceName}" with ${professionalName} on ${appointmentDate} at ${appointmentTime} has been successfully submitted.
      The initial quote is $${quote}.
      ${professionalName} will review your request and get back to you shortly. You will be notified of any updates.

      ${getEmailFooter().replace(/<[^>]*>?/gm, '')}
    `;
    html = `
      <p>Hello ${customerName},</p>
      <p>Your appointment request for "<strong>${serviceName}</strong>" with <strong>${professionalName}</strong> on <strong>${appointmentDate} at ${appointmentTime}</strong> has been successfully submitted.</p>
      <p>The initial quote is <strong>$${quote}</strong>.</p>
      <p>${professionalName} will review your request and get back to you shortly. You will be notified of any updates.</p>
      ${getEmailFooter()}
    `;
  } else if (recipientType === 'professional') {
    subject = `New Appointment Request from ${customerName} for "${serviceName}"`;
    text = `
      Hello ${professionalName},

      You have a new appointment request from ${customerName} for "${serviceName}" on ${appointmentDate} at ${appointmentTime}.
      The initial proposed quote is $${quote}.
      Please review this request in your dashboard and respond (accept, reject, or counter-offer).

      ${getEmailFooter().replace(/<[^>]*>?/gm, '')}
    `;
    html = `
      <p>Hello ${professionalName},</p>
      <p>You have a new appointment request from <strong>${customerName}</strong> for "<strong>${serviceName}</strong>" on <strong>${appointmentDate} at ${appointmentTime}</strong>.</p>
      <p>The initial proposed quote is <strong>$${quote}</strong>.</p>
      <p>Please review this request in your dashboard and respond (accept, reject, or counter-offer).</p>
      ${getEmailFooter()}
    `;
  }
  return { subject, text, html };
};

// --- Appointment Accepted ---
export const getAppointmentAcceptedEmail = (appointmentDetails, recipientType) => {
  const { professionalName, customerName, serviceName, appointmentDate, appointmentTime, finalQuote } = appointmentDetails;
  let subject = '';
  let text = '';
  let html = '';

  if (recipientType === 'customer') {
    subject = `Great News! Your Appointment with ${professionalName} is Confirmed!`;
    text = `
      Hello ${customerName},

      Good news! Your appointment for "${serviceName}" with ${professionalName} on ${appointmentDate} at ${appointmentTime} has been confirmed.
      The final agreed quote is $${finalQuote}.
      We look forward to seeing you!

      ${getEmailFooter().replace(/<[^>]*>?/gm, '')}
    `;
    html = `
      <p>Hello ${customerName},</p>
      <p>Good news! Your appointment for "<strong>${serviceName}</strong>" with <strong>${professionalName}</strong> on <strong>${appointmentDate} at ${appointmentTime}</strong> has been confirmed.</p>
      <p>The final agreed quote is <strong>$${finalQuote}</strong>.</p>
      <p>We look forward to seeing you!</p>
      ${getEmailFooter()}
    `;
  } else if (recipientType === 'professional') {
    subject = `Appointment Confirmed: ${serviceName} with ${customerName}`;
    text = `
      Hello ${professionalName},

      You have confirmed the appointment for "${serviceName}" with ${customerName} on ${appointmentDate} at ${appointmentTime}.
      The final agreed quote is $${finalQuote}.
      This appointment is now booked in your schedule.

      ${getEmailFooter().replace(/<[^>]*>?/gm, '')}
    `;
    html = `
      <p>Hello ${professionalName},</p>
      <p>You have confirmed the appointment for "<strong>${serviceName}</strong>" with <strong>${customerName}</strong> on <strong>${appointmentDate} at ${appointmentTime}</strong>.</p>
      <p>The final agreed quote is <strong>$${finalQuote}</strong>.</p>
      <p>This appointment is now booked in your schedule.</p>
      ${getEmailFooter()}
    `;
  }
  return { subject, text, html };
};

// --- Appointment Rejected ---
export const getAppointmentRejectedEmail = (appointmentDetails, recipientType, rejectedBy) => {
  const { professionalName, customerName, serviceName, appointmentDate, appointmentTime, reason } = appointmentDetails;
  let subject = '';
  let text = '';
  let html = '';
  const rejectionReasonText = reason ? `Reason for rejection: ${reason}` : 'No specific reason was provided.';
  const rejectionReasonHtml = reason ? `<p>Reason for rejection: ${reason}</p>` : '<p>No specific reason was provided.</p>';


  if (recipientType === 'customer') { // Professional rejected or system/customer initiated rejection affecting customer
    subject = `Update on Your Appointment Request with ${professionalName}`;
    text = `
      Hello ${customerName},

      Unfortunately, your appointment request for "${serviceName}" with ${professionalName} on ${appointmentDate} at ${appointmentTime} could not be confirmed.
      ${rejectedBy === 'professional' ? `${professionalName} has rejected the request.` : 'The request has been rejected.'}
      ${rejectionReasonText}
      Please feel free to search for other professionals or services.

      ${getEmailFooter().replace(/<[^>]*>?/gm, '')}
    `;
    html = `
      <p>Hello ${customerName},</p>
      <p>Unfortunately, your appointment request for "<strong>${serviceName}</strong>" with <strong>${professionalName}</strong> on <strong>${appointmentDate} at ${appointmentTime}</strong> could not be confirmed.</p>
      <p>${rejectedBy === 'professional' ? `${professionalName} has rejected the request.` : 'The request has been rejected.'}</p>
      ${rejectionReasonHtml}
      <p>Please feel free to search for other professionals or services.</p>
      ${getEmailFooter()}
    `;
  } else if (recipientType === 'professional') { // Customer rejected
    subject = `Appointment Request from ${customerName} for "${serviceName}" was Rejected`;
    text = `
      Hello ${professionalName},

      The appointment request from ${customerName} for "${serviceName}" on ${appointmentDate} at ${appointmentTime} has been rejected by the customer.
      ${rejectionReasonText}
      This slot may now be available for other bookings.

      ${getEmailFooter().replace(/<[^>]*>?/gm, '')}
    `;
    html = `
      <p>Hello ${professionalName},</p>
      <p>The appointment request from <strong>${customerName}</strong> for "<strong>${serviceName}</strong>" on <strong>${appointmentDate} at ${appointmentTime}</strong> has been rejected by the customer.</p>
      ${rejectionReasonHtml}
      <p>This slot may now be available for other bookings.</p>
      ${getEmailFooter()}
    `;
  }
  return { subject, text, html };
};

// --- Appointment Counter-Offered ---
export const getAppointmentCounterOfferEmail = (appointmentDetails, recipientType) => {
  const { professionalName, customerName, serviceName, appointmentDate, appointmentTime, originalQuote, counterQuote, counterOfferReason } = appointmentDetails;
  let subject = '';
  let text = '';
  let html = '';
  const reasonText = counterOfferReason ? `Reason for counter-offer: ${counterOfferReason}` : '';
  const reasonHtml = counterOfferReason ? `<p>Reason for counter-offer: ${counterOfferReason}</p>` : '';

  if (recipientType === 'customer') { // Professional made a counter-offer
    subject = `Counter-Offer for Your Appointment with ${professionalName}`;
    text = `
      Hello ${customerName},

      ${professionalName} has made a counter-offer for your appointment request for "${serviceName}" on ${appointmentDate} at ${appointmentTime}.
      Original Quote: $${originalQuote}
      New Proposed Quote: $${counterQuote}
      ${reasonText}
      Please review this counter-offer in your dashboard and respond (accept or reject).

      ${getEmailFooter().replace(/<[^>]*>?/gm, '')}
    `;
    html = `
      <p>Hello ${customerName},</p>
      <p><strong>${professionalName}</strong> has made a counter-offer for your appointment request for "<strong>${serviceName}</strong>" on <strong>${appointmentDate} at ${appointmentTime}</strong>.</p>
      <p>Original Quote: <strong>$${originalQuote}</strong></p>
      <p>New Proposed Quote: <strong>$${counterQuote}</strong></p>
      ${reasonHtml}
      <p>Please review this counter-offer in your dashboard and respond (accept or reject).</p>
      ${getEmailFooter()}
    `;
  } else if (recipientType === 'professional') { // Customer made a counter-offer (if applicable, or if professional is notified of their own counter)
    // This scenario might be less common for professional to receive if they initiated it.
    // Adjust if customer can also counter-offer. For now, assuming professional initiated.
    subject = `You Sent a Counter-Offer to ${customerName}`;
    text = `
      Hello ${professionalName},

      You have sent a counter-offer to ${customerName} for the appointment "${serviceName}" on ${appointmentDate} at ${appointmentTime}.
      Original Quote: $${originalQuote}
      Your Counter-Offer: $${counterQuote}
      ${reasonText}
      ${customerName} will be notified and can accept or reject your counter-offer.

      ${getEmailFooter().replace(/<[^>]*>?/gm, '')}
    `;
    html = `
      <p>Hello ${professionalName},</p>
      <p>You have sent a counter-offer to <strong>${customerName}</strong> for the appointment "<strong>${serviceName}</strong>" on <strong>${appointmentDate} at ${appointmentTime}</strong>.</p>
      <p>Original Quote: <strong>$${originalQuote}</strong></p>
      <p>Your Counter-Offer: <strong>$${counterQuote}</strong></p>
      ${reasonHtml}
      <p>${customerName} will be notified and can accept or reject your counter-offer.</p>
      ${getEmailFooter()}
    `;
  }
  return { subject, text, html };
};

// --- Appointment Cancelled ---
export const getAppointmentCancelledEmail = (appointmentDetails, recipientType, cancelledBy) => {
  const { professionalName, customerName, serviceName, appointmentDate, appointmentTime, cancellationReason } = appointmentDetails;
  let subject = '';
  let text = '';
  let html = '';
  const reasonText = cancellationReason ? `Reason for cancellation: ${cancellationReason}` : 'No specific reason was provided.';
  const reasonHtml = cancellationReason ? `<p>Reason for cancellation: ${cancellationReason}</p>` : '<p>No specific reason was provided.</p>';

  subject = `Appointment Cancelled: ${serviceName} on ${appointmentDate}`;

  if (recipientType === 'customer') {
    text = `
      Hello ${customerName},

      Your appointment for "${serviceName}" with ${professionalName} on ${appointmentDate} at ${appointmentTime} has been cancelled.
      Cancelled by: ${cancelledBy}
      ${reasonText}
      If you did not initiate this cancellation and have questions, please contact ${professionalName} or our support.

      ${getEmailFooter().replace(/<[^>]*>?/gm, '')}
    `;
    html = `
      <p>Hello ${customerName},</p>
      <p>Your appointment for "<strong>${serviceName}</strong>" with <strong>${professionalName}</strong> on <strong>${appointmentDate} at ${appointmentTime}</strong> has been cancelled.</p>
      <p>Cancelled by: <strong>${cancelledBy}</strong></p>
      ${reasonHtml}
      <p>If you did not initiate this cancellation and have questions, please contact ${professionalName} or our support.</p>
      ${getEmailFooter()}
    `;
  } else if (recipientType === 'professional') {
    text = `
      Hello ${professionalName},

      The appointment for "${serviceName}" with ${customerName} on ${appointmentDate} at ${appointmentTime} has been cancelled.
      Cancelled by: ${cancelledBy}
      ${reasonText}
      This time slot may now be available.

      ${getEmailFooter().replace(/<[^>]*>?/gm, '')}
    `;
    html = `
      <p>Hello ${professionalName},</p>
      <p>The appointment for "<strong>${serviceName}</strong>" with <strong>${customerName}</strong> on <strong>${appointmentDate} at ${appointmentTime}</strong> has been cancelled.</p>
      <p>Cancelled by: <strong>${cancelledBy}</strong></p>
      ${reasonHtml}
      <p>This time slot may now be available.</p>
      ${getEmailFooter()}
    `;
  }
  return { subject, text, html };
};

// --- Appointment Completed ---
export const getAppointmentCompletedEmail = (appointmentDetails, recipientType) => {
  const { professionalName, customerName, serviceName, appointmentDate, appointmentTime } = appointmentDetails;
  let subject = '';
  let text = '';
  let html = '';

  subject = `Your Appointment for "${serviceName}" is Complete!`;

  if (recipientType === 'customer') {
    text = `
      Hello ${customerName},

      Your appointment for "${serviceName}" with ${professionalName} on ${appointmentDate} at ${appointmentTime} has been marked as completed.
      We hope you had a great experience!
      Feel free to leave a review for ${professionalName}.

      ${getEmailFooter().replace(/<[^>]*>?/gm, '')}
    `;
    html = `
      <p>Hello ${customerName},</p>
      <p>Your appointment for "<strong>${serviceName}</strong>" with <strong>${professionalName}</strong> on <strong>${appointmentDate} at ${appointmentTime}</strong> has been marked as completed.</p>
      <p>We hope you had a great experience!</p>
      <p>Feel free to leave a review for ${professionalName}.</p>
      ${getEmailFooter()}
    `;
  } else if (recipientType === 'professional') {
    text = `
      Hello ${professionalName},

      The appointment for "${serviceName}" with ${customerName} on ${appointmentDate} at ${appointmentTime} has been marked as completed.
      Great job!

      ${getEmailFooter().replace(/<[^>]*>?/gm, '')}
    `;
    html = `
      <p>Hello ${professionalName},</p>
      <p>The appointment for "<strong>${serviceName}</strong>" with <strong>${customerName}</strong> on <strong>${appointmentDate} at ${appointmentTime}</strong> has been marked as completed.</p>
      <p>Great job!</p>
      ${getEmailFooter()}
    `;
  }
  return { subject, text, html };
};
