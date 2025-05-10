import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
import jwt from 'jsonwebtoken'; // Assuming JWT for auth

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

    const professionalUserId = await getUserIdFromToken(request);
    if (!professionalUserId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const body = await request.json();
    const { action, finalPrice: newFinalPrice } = body; // action: 'confirm', 'reject', 'counter', 'accept_counter', 'reject_counter', 'cancel_by_customer', 'cancel_by_professional'

    const validActions = ['confirm', 'reject', 'counter', 'accept_counter', 'reject_counter', 'cancel_by_customer', 'cancel_by_professional'];
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
    const actingUser = await usersCollection.findOne({ _id: new ObjectId(professionalUserId) }, { projection: { role: 1 } }); // professionalUserId is the logged in user ID

    if (!actingUser) {
        return NextResponse.json({ message: 'Acting user not found.' }, { status: 404 });
    }

    const updateFields = { updatedAt: new Date() };
    let newStatus = appointment.status;
    let historyEntry;
    const now = new Date();

    if (['confirm', 'reject', 'counter'].includes(action)) {
      // Professional actions
      if (actingUser.role !== 'professional' || appointment.professionalId.toString() !== professionalUserId) {
        return NextResponse.json({ message: 'Unauthorized: Only the assigned professional can perform this action.' }, { status: 403 });
      }
      if (appointment.status !== 'pending_professional_approval') {
        return NextResponse.json({ message: `Action '${action}' not allowed on appointment with status: ${appointment.status}` }, { status: 400 });
      }

      switch (action) {
        case 'confirm':
          newStatus = 'confirmed';
          historyEntry = { timestamp: now, actionBy: 'professional', userId: new ObjectId(professionalUserId), actionType: 'confirmed_request', details: {} };
          break;
        case 'reject':
          newStatus = 'rejected_by_professional';
          historyEntry = { timestamp: now, actionBy: 'professional', userId: new ObjectId(professionalUserId), actionType: 'rejected_request', details: {} };
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
          historyEntry = { timestamp: now, actionBy: 'professional', userId: new ObjectId(professionalUserId), actionType: 'counter_offered', details: { oldPrice: appointment.quotedPrice, newPrice: newFinalPrice } };
          break;
      }
    } else if (['accept_counter', 'reject_counter'].includes(action)) {
      // Customer actions
      if (actingUser.role !== 'customer' || appointment.customerId.toString() !== professionalUserId) { // professionalUserId is the logged-in user
        return NextResponse.json({ message: 'Unauthorized: Only the customer for this appointment can perform this action.' }, { status: 403 });
      }
      if (appointment.status !== 'countered_by_professional') {
        return NextResponse.json({ message: `Action '${action}' not allowed on appointment with status: ${appointment.status}` }, { status: 400 });
      }

      switch (action) {
        case 'accept_counter':
          newStatus = 'confirmed';
          // finalPrice is already set by professional's counter action
          historyEntry = { timestamp: now, actionBy: 'customer', userId: new ObjectId(professionalUserId), actionType: 'accepted_counter_offer', details: { finalPrice: appointment.finalPrice } };
          break;
        case 'reject_counter':
          newStatus = 'cancelled_by_customer'; // Or 'counter_rejected_by_customer'
          historyEntry = { timestamp: now, actionBy: 'customer', userId: new ObjectId(professionalUserId), actionType: 'rejected_counter_offer', details: { finalPrice: appointment.finalPrice } };
          break;
      }
    } else if (['cancel_by_customer', 'cancel_by_professional'].includes(action)) {
      // Cancellation actions
      if (appointment.status !== 'confirmed') {
        return NextResponse.json({ message: `Cancellation not allowed on appointment with status: ${appointment.status}` }, { status: 400 });
      }

      if (action === 'cancel_by_customer') {
        if (actingUser.role !== 'customer' || appointment.customerId.toString() !== professionalUserId) {
          return NextResponse.json({ message: 'Unauthorized: Only the customer for this appointment can cancel it.' }, { status: 403 });
        }
        newStatus = 'cancelled_by_customer';
        historyEntry = { timestamp: now, actionBy: 'customer', userId: new ObjectId(professionalUserId), actionType: 'cancelled_appointment', details: {} };
      } else { // cancel_by_professional
        if (actingUser.role !== 'professional' || appointment.professionalId.toString() !== professionalUserId) {
          return NextResponse.json({ message: 'Unauthorized: Only the professional for this appointment can cancel it.' }, { status: 403 });
        }
        newStatus = 'cancelled_by_professional';
        historyEntry = { timestamp: now, actionBy: 'professional', userId: new ObjectId(professionalUserId), actionType: 'cancelled_appointment', details: {} };
      }
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
    if (result.modifiedCount === 0) {
      return NextResponse.json({ message: 'Appointment not updated, status or data may be unchanged.' }, { status: 200 });
    }

    const updatedAppointment = await appointmentsCollection.findOne({ _id: appointmentObjectId });
    return NextResponse.json({ message: `Appointment ${action}ed successfully.`, appointment: updatedAppointment }, { status: 200 });

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
