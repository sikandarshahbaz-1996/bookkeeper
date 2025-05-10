import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
// import { getSession } from 'next-auth/react'; // Commented out: getSession is for client-side

// Helper function to get user session (adapt to your auth setup)
// IMPORTANT: This function currently relies on 'x-user-id' header.
// You MUST replace this with your actual secure server-side session retrieval logic (e.g., NextAuth.js getServerSession).
async function getCurrentUserId(req) {
  const userIdFromHeader = req.headers.get('x-user-id');
  if (userIdFromHeader) {
    try {
      return new ObjectId(userIdFromHeader);
    } catch (error) {
      console.error("Invalid user ID format in 'x-user-id' header:", error);
      return null;
    }
  }
  // Other session retrieval methods (like parsing a cookie directly or using a specific middleware's output)
  // would go here if not using a simple header.
  // e.g., if a middleware added `req.user`:
  // if (req.user && req.user.id) {
  //   try {
  //     return new ObjectId(req.user.id);
  //   } catch (error) {
  //     console.error("Invalid user ID format from req.user:", error);
  //     return null;
  //   }
  // }

  console.warn("No 'x-user-id' header found. Authentication will fail for POST /api/reviews.");
  return null; // Or throw an error
}

export async function POST(req) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const currentUserId = await getCurrentUserId(req); // Placeholder for getting authenticated user's ID
    if (!currentUserId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const { appointmentId, rating, comment } = await req.json();

    if (!appointmentId || rating === undefined) {
      return NextResponse.json({ message: 'Appointment ID and rating are required' }, { status: 400 });
    }

    if (typeof rating !== 'number' || rating < 1 || rating > 5) {
      return NextResponse.json({ message: 'Rating must be a number between 1 and 5' }, { status: 400 });
    }

    let objectIdAppointmentId;
    try {
      objectIdAppointmentId = new ObjectId(appointmentId);
    } catch (error) {
      return NextResponse.json({ message: 'Invalid Appointment ID format' }, { status: 400 });
    }

    // 1. Fetch the appointment
    const appointment = await db.collection('appointments').findOne({ _id: objectIdAppointmentId });

    if (!appointment) {
      return NextResponse.json({ message: 'Appointment not found' }, { status: 404 });
    }

    // 2. Verify status is 'completed' (adjust status string if different)
    if (appointment.status !== 'completed') {
      return NextResponse.json({ message: 'Appointment is not yet completed. Cannot leave a review.' }, { status: 403 });
    }

    // 3. Verify the current user is the customer for this appointment
    // Assuming appointment.customerId stores the ObjectId of the customer
    if (!appointment.customerId || !appointment.customerId.equals(currentUserId)) {
      return NextResponse.json({ message: 'You are not authorized to review this appointment' }, { status: 403 });
    }

    // 4. Check if a review for this appointment already exists
    const existingReview = await db.collection('reviews').findOne({ appointmentId: objectIdAppointmentId });
    if (existingReview) {
      return NextResponse.json({ message: 'A review for this appointment has already been submitted' }, { status: 409 });
    }

    // 5. Save the new review
    const newReview = {
      appointmentId: objectIdAppointmentId,
      professionalId: appointment.professionalId, // Assuming professionalId is stored in the appointment
      customerId: currentUserId,
      rating: parseInt(rating, 10),
      comment: comment || '', // Ensure comment is a string, even if empty
      createdAt: new Date(),
    };

    const result = await db.collection('reviews').insertOne(newReview);

    // TODO: Later, update the professional's average rating and total reviews
    // This could be done here or via a database trigger/separate process

    return NextResponse.json({ message: 'Review submitted successfully', reviewId: result.insertedId }, { status: 201 });

  } catch (error) {
    console.error('Failed to submit review:', error);
    return NextResponse.json({ message: 'Failed to submit review', error: error.message }, { status: 500 });
  }
}
