import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken'; // Assuming JWT for auth
import { sendMail } from '@/lib/nodemailer';
import {
  getAppointmentAcceptedEmail,
  getAppointmentRejectedEmail,
  getAppointmentCounterOfferEmail,
  getAppointmentCancelledEmail,
  getAppointmentCompletedEmail,
} from '@/lib/emailTemplates';

// Helper function to convert UTC HH:MM time to Local HH:MM time for a given timezone
// This is a simplified version. A robust solution would use a library like date-fns-tz.
const convertUTCToLocalHHMm = (utcTimeString, utcDateString, timezone) => {
  if (!utcTimeString || !utcDateString || !timezone) return utcTimeString; // Fallback
  try {
    const [hours, minutes] = utcTimeString.split(':').map(Number);
    const [year, month, day] = utcDateString.split('-').map(Number);

    // Create a Date object representing the UTC moment
    const utcDate = new Date(Date.UTC(year, month - 1, day, hours, minutes));

    // Format this UTC date into the target timezone
    const formatter = new Intl.DateTimeFormat('en-CA', { // 'en-CA' or any locale, it's for formatting options
      timeZone: timezone,
      hour: '2-digit',
      minute: '2-digit',
      hour12: false, // Use 24-hour format for consistency if needed, or true for AM/PM
    });
    
    return formatter.format(utcDate);
  } catch (error) {
    console.error("Error converting UTC to Local HH:mm for email:", error);
    return utcTimeString; // Fallback to UTC time string
  }
};


// Utility to verify token and get user ID (adapt to your actual auth mechanism)
async function getUserIdFromToken(request) {
  const authHeader = request.headers.get('authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return decoded.userId;
  } catch (error) {
    console.error('Invalid token for action:', error.message);
    return null;
  }
}

export async function PUT(request, context) {
  try {
    const { appointmentId } = context.params;
    if (!appointmentId || !ObjectId.isValid(appointmentId)) {
      return NextResponse.json({ message: 'Valid appointment ID is required' }, { status: 400 });
    }

    const actingUserId = await getUserIdFromToken(request); // This is the ID of the logged-in user performing the action
    if (!actingUserId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    // Include reason fields if they are part of the request body for specific actions
    const { action, finalPrice: newFinalPrice, reason: actionReason } = body; 

    const validActions = ['confirm', 'reject', 'counter', 'accept_counter', 'reject_counter', 'cancel_by_customer', 'cancel_by_professional', 'complete'];
    if (!action || !validActions.includes(action)) {
      return NextResponse.json({ message: `Invalid action specified. Must be one of: ${validActions.join(', ')}.` }, { status: 400 });
    }

    const appointmentsCollection = await getCollection('appointments');
    const appointmentObjectId = new ObjectId(appointmentId);

    const appointment = await appointmentsCollection.findOne({ _id: appointmentObjectId });

    if (!appointment) {
      return NextResponse.json({ message: 'Appointment not found' }, { status: 404 });
    }
    
    const usersCollection = await getCollection('users');
    const actingUser = await usersCollection.findOne({ _id: new ObjectId(actingUserId) }, { projection: { role: 1 } }); // actingUserId is the logged in user ID

    if (!actingUser) {
        return NextResponse.json({ message: 'Acting user not found.' }, { status: 404 });
    }

    const updateFields = { updatedAt: new Date() };
    let newStatus = appointment.status;
    let historyEntry;
    const now = new Date();

    if (['confirm', 'reject', 'counter'].includes(action)) {
      // Professional actions
      if (actingUser.role !== 'professional' || appointment.professionalId.toString() !== actingUserId) {
        return NextResponse.json({ message: 'Unauthorized: Only the assigned professional can perform this action.' }, { status: 403 });
      }
      if (appointment.status !== 'pending_professional_approval') {
        return NextResponse.json({ message: `Action '${action}' not allowed on appointment with status: ${appointment.status}` }, { status: 400 });
      }

      switch (action) {
        case 'confirm':
          newStatus = 'confirmed';
          historyEntry = { timestamp: now, actionBy: 'professional', userId: new ObjectId(actingUserId), actionType: 'confirmed_request', details: {} };
          break;
        case 'reject':
          newStatus = 'rejected_by_professional';
          historyEntry = { timestamp: now, actionBy: 'professional', userId: new ObjectId(actingUserId), actionType: 'rejected_request', details: { reason: actionReason || 'Not provided' } };
          break;
        case 'counter':
          if (typeof newFinalPrice !== 'number' || newFinalPrice < 0) {
            return NextResponse.json({ message: 'Valid new final price is required for counter offer.' }, { status: 400 });
          }
          if (newFinalPrice === appointment.quotedPrice) {
              return NextResponse.json({ message: 'Counter offer price cannot be the same as the original quoted price.' }, { status: 400 });
          }
          newStatus = 'countered_by_professional';
          updateFields.finalPrice = newFinalPrice;
          historyEntry = { timestamp: now, actionBy: 'professional', userId: new ObjectId(actingUserId), actionType: 'counter_offered', details: { oldPrice: appointment.quotedPrice, newPrice: newFinalPrice, reason: actionReason || 'Not provided' } };
          break;
      }
    } else if (['accept_counter', 'reject_counter'].includes(action)) {
      // Customer actions
      if (actingUser.role !== 'customer' || appointment.customerId.toString() !== actingUserId) { // actingUserId is the logged-in user
        return NextResponse.json({ message: 'Unauthorized: Only the customer for this appointment can perform this action.' }, { status: 403 });
      }
      if (appointment.status !== 'countered_by_professional') {
        return NextResponse.json({ message: `Action '${action}' not allowed on appointment with status: ${appointment.status}` }, { status: 400 });
      }

      switch (action) {
        case 'accept_counter':
          newStatus = 'confirmed';
          // finalPrice is already set by professional's counter action
          historyEntry = { timestamp: now, actionBy: 'customer', userId: new ObjectId(actingUserId), actionType: 'accepted_counter_offer', details: { finalPrice: appointment.finalPrice } };
          break;
        case 'reject_counter':
          newStatus = 'rejected_by_customer'; // Or 'counter_rejected_by_customer'
          historyEntry = { timestamp: now, actionBy: 'customer', userId: new ObjectId(actingUserId), actionType: 'rejected_counter_offer', details: { finalPrice: appointment.finalPrice, reason: actionReason || 'Not provided' } };
          break;
      }
    } else if (['cancel_by_customer', 'cancel_by_professional'].includes(action)) {
      // Cancellation actions
      // Allow cancellation if pending_professional_approval or confirmed
      if (!['confirmed', 'pending_professional_approval', 'countered_by_professional'].includes(appointment.status)) {
        return NextResponse.json({ message: `Cancellation not allowed on appointment with status: ${appointment.status}` }, { status: 400 });
      }

      if (action === 'cancel_by_customer') {
        if (actingUser.role !== 'customer' || appointment.customerId.toString() !== actingUserId) {
          return NextResponse.json({ message: 'Unauthorized: Only the customer for this appointment can cancel it.' }, { status: 403 });
        }
        newStatus = 'cancelled_by_customer';
        historyEntry = { timestamp: now, actionBy: 'customer', userId: new ObjectId(actingUserId), actionType: 'cancelled_appointment', details: { reason: actionReason || 'Not provided' } };
      } else { // cancel_by_professional
        if (actingUser.role !== 'professional' || appointment.professionalId.toString() !== actingUserId) {
          return NextResponse.json({ message: 'Unauthorized: Only the professional for this appointment can cancel it.' }, { status: 403 });
        }
        newStatus = 'cancelled_by_professional';
        historyEntry = { timestamp: now, actionBy: 'professional', userId: new ObjectId(actingUserId), actionType: 'cancelled_appointment', details: { reason: actionReason || 'Not provided' } };
      }
    } else if (action === 'complete') {
      // Professional completes the appointment
      if (actingUser.role !== 'professional' || appointment.professionalId.toString() !== actingUserId) {
        return NextResponse.json({ message: 'Unauthorized: Only the assigned professional can complete this appointment.' }, { status: 403 });
      }
      if (appointment.status !== 'confirmed') {
        return NextResponse.json({ message: `Action 'complete' not allowed on appointment with status: ${appointment.status}` }, { status: 400 });
      }
      newStatus = 'completed';
      historyEntry = { timestamp: now, actionBy: 'professional', userId: new ObjectId(actingUserId), actionType: 'completed_appointment', details: {} };
    } else {
      // This case should ideally not be reached if initial validActions check is comprehensive
      return NextResponse.json({ message: 'Invalid action type.' }, { status: 400 });
    }

    updateFields.status = newStatus;
    
    const result = await appointmentsCollection.updateOne(
      { _id: appointmentObjectId },
      { 
        $set: updateFields,
        $push: { history: historyEntry }
      }
    );

    if (result.matchedCount === 0) {
      // Should not happen if appointment was found earlier
      return NextResponse.json({ message: 'Appointment not found during update' }, { status: 404 });
    }
    if (result.modifiedCount === 0 && result.matchedCount > 0) { // Matched but not modified (e.g. same status)
      // Potentially still send email if it's a re-notification or if action implies notification regardless of DB change
      // For now, let's assume if not modified, no email needed unless explicitly stated.
      // However, the status *is* changing based on `action`, so modifiedCount should be > 0 if action is valid.
      // This path might be hit if trying to "confirm" an already "confirmed" appointment if checks were loose.
      // Given current checks, this should mean no actual change was made that warrants a new email.
      const currentAppointmentState = await appointmentsCollection.findOne({ _id: appointmentObjectId });
      return NextResponse.json({ message: 'Appointment status unchanged or action led to no data modification.', appointment: currentAppointmentState }, { status: 200 });
    }
     if (result.modifiedCount === 0) { // General case for not modified
        return NextResponse.json({ message: 'Appointment not updated, status or data may be unchanged.' }, { status: 200 });
    }


    const updatedAppointment = await appointmentsCollection.findOne({ _id: appointmentObjectId });

    // Send emails
    if (updatedAppointment) {
      try {
        const customerUser = await usersCollection.findOne({ _id: updatedAppointment.customerId });
        const professionalUser = await usersCollection.findOne({ _id: updatedAppointment.professionalId });

        if (customerUser && professionalUser && customerUser.email && professionalUser.email) {
          const localAppointmentTime = convertUTCToLocalHHMm(updatedAppointment.startTime, updatedAppointment.appointmentDate, updatedAppointment.professionalTimezone);
          
          const baseEmailDetails = {
            professionalName: professionalUser.name || `${professionalUser.firstName} ${professionalUser.lastName}`,
            customerName: customerUser.name || `${customerUser.firstName} ${customerUser.lastName}`,
            serviceName: updatedAppointment.services.map(s => s.name).join(', '),
            appointmentDate: updatedAppointment.appointmentDate,
            appointmentTime: localAppointmentTime, // Use converted local time
            appointmentId: updatedAppointment._id.toString(),
            professionalTimezone: updatedAppointment.professionalTimezone,
          };

          let emailContent;
          let recipientEmail;
          let recipientType = ''; // 'customer' or 'professional'

          switch (action) {
            case 'confirm': // Professional confirms original request
            case 'accept_counter': // Customer accepts counter
              emailContent = getAppointmentAcceptedEmail({ ...baseEmailDetails, finalQuote: updatedAppointment.finalPrice }, 'customer');
              await sendMail({ to: customerUser.email, ...emailContent });
              emailContent = getAppointmentAcceptedEmail({ ...baseEmailDetails, finalQuote: updatedAppointment.finalPrice }, 'professional');
              await sendMail({ to: professionalUser.email, ...emailContent });
              console.log(`Appointment accepted/confirmed emails sent for ${updatedAppointment._id}`);
              break;

            case 'reject': // Professional rejects original request
              emailContent = getAppointmentRejectedEmail({ ...baseEmailDetails, reason: actionReason || historyEntry.details.reason }, 'customer', 'professional');
              await sendMail({ to: customerUser.email, ...emailContent });
              console.log(`Appointment rejected by professional email sent for ${updatedAppointment._id}`);
              break;
            
            case 'reject_counter': // Customer rejects counter offer
              // Notify professional that their counter was rejected
              emailContent = getAppointmentRejectedEmail({ ...baseEmailDetails, quote: updatedAppointment.finalPrice, reason: actionReason || historyEntry.details.reason }, 'professional', 'customer');
              await sendMail({ to: professionalUser.email, ...emailContent });
              console.log(`Counter offer rejected by customer email sent for ${updatedAppointment._id}`);
              break;

            case 'counter': // Professional makes a counter-offer
              emailContent = getAppointmentCounterOfferEmail({
                ...baseEmailDetails,
                originalQuote: appointment.quotedPrice, // Original quote before this counter
                counterQuote: updatedAppointment.finalPrice,
                counterOfferReason: actionReason || historyEntry.details.reason,
              }, 'customer');
              await sendMail({ to: customerUser.email, ...emailContent });
               // Optionally notify professional they sent a counter (template supports this)
              const profCounterNotification = getAppointmentCounterOfferEmail({
                ...baseEmailDetails,
                originalQuote: appointment.quotedPrice,
                counterQuote: updatedAppointment.finalPrice,
                counterOfferReason: actionReason || historyEntry.details.reason,
              }, 'professional');
              await sendMail({ to: professionalUser.email, ...profCounterNotification });
              console.log(`Appointment counter-offer email sent for ${updatedAppointment._id}`);
              break;

            case 'cancel_by_customer':
              emailContent = getAppointmentCancelledEmail({ ...baseEmailDetails, cancellationReason: actionReason || historyEntry.details.reason }, 'professional', 'Customer');
              await sendMail({ to: professionalUser.email, ...emailContent });
              // Also notify customer of their cancellation confirmation
              const custCancelConfirm = getAppointmentCancelledEmail({ ...baseEmailDetails, cancellationReason: actionReason || historyEntry.details.reason }, 'customer', 'You (Customer)');
              await sendMail({ to: customerUser.email, ...custCancelConfirm });
              console.log(`Appointment cancelled by customer emails sent for ${updatedAppointment._id}`);
              break;

            case 'cancel_by_professional':
              emailContent = getAppointmentCancelledEmail({ ...baseEmailDetails, cancellationReason: actionReason || historyEntry.details.reason }, 'customer', 'Professional');
              await sendMail({ to: customerUser.email, ...emailContent });
               // Also notify professional of their cancellation confirmation
              const profCancelConfirm = getAppointmentCancelledEmail({ ...baseEmailDetails, cancellationReason: actionReason || historyEntry.details.reason }, 'professional', 'You (Professional)');
              await sendMail({ to: professionalUser.email, ...profCancelConfirm });
              console.log(`Appointment cancelled by professional emails sent for ${updatedAppointment._id}`);
              break;

            case 'complete':
              emailContent = getAppointmentCompletedEmail(baseEmailDetails, 'customer');
              await sendMail({ to: customerUser.email, ...emailContent });
              emailContent = getAppointmentCompletedEmail(baseEmailDetails, 'professional');
              await sendMail({ to: professionalUser.email, ...emailContent });
              console.log(`Appointment completed emails sent for ${updatedAppointment._id}`);
              break;
          }
        } else {
          console.error(`Could not send emails for action '${action}' on appointment ${updatedAppointment._id}: Customer or professional details (email) missing.`);
        }
      } catch (emailError) {
        console.error(`Failed to send emails for action '${action}' on appointment ${updatedAppointment._id}:`, emailError);
        // Do not fail the request if email sending fails, but log it.
      }
    }

    return NextResponse.json({ message: `Appointment ${action}ed successfully. Status: ${updatedAppointment.status}`, appointment: updatedAppointment }, { status: 200 });

  } catch (error) {
    console.error(`[API /api/appointments/${context.params?.appointmentId}/action PUT] Error:`, error);
    if (error instanceof SyntaxError) {
        return NextResponse.json({ message: 'Invalid JSON format in request body' }, { status: 400 });
    }
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
