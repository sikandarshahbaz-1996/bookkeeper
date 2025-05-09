import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { sendMail } from '@/lib/nodemailer';
import crypto from 'crypto';

export async function POST(request) {
  try {
    const { email } = await request.json();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ message: 'Valid email is required' }, { status: 400 });
    }

    const resetToken = crypto.randomInt(100000, 999999).toString();
    const resetTokenExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    let userCollection;
    let user;

    // Try finding in 'users' collection
    userCollection = await getCollection('users');
    user = await userCollection.findOne({ email });

    let userType = 'user';

    // If not found in 'users', try 'professionals' collection
    if (!user) {
      userCollection = await getCollection('professionals');
      user = await userCollection.findOne({ email });
      userType = 'professional';
    }

    if (!user) {
      // To prevent user enumeration, always return a generic success message on the client-side.
      // However, for server logs or specific handling, you might know the user wasn't found.
      // The client-side toast message is already generic.
      console.log(`Password reset request for non-existent email: ${email}`);
      // It's important to still return a 200 OK response here to prevent email enumeration attacks.
      // The frontend will show a generic "If an account exists..." message.
      return NextResponse.json({ message: 'If an account with that email exists, a password reset code has been sent.' }, { status: 200 });
    }

    // Store the reset token and expiry in the user's document
    const collectionToUpdate = userType === 'user' ? 'users' : 'professionals';
    const currentCollection = await getCollection(collectionToUpdate);
    
    await currentCollection.updateOne(
      { email: email },
      { $set: { resetPasswordToken: resetToken, resetPasswordExpires: resetTokenExpires } }
    );

    // Send the verification email
    const subject = 'Your Password Reset Code for Bookkeeper App';
    const text = `Your password reset code is: ${resetToken}\n\nThis code will expire in 10 minutes. If you did not request this, please ignore this email.`;
    const html = `
      <p>Hello,</p>
      <p>You requested a password reset for your Bookkeeper App account.</p>
      <p>Your password reset code is: <strong>${resetToken}</strong></p>
      <p>This code will expire in 10 minutes.</p>
      <p>If you did not request this, please ignore this email.</p>
    `;

    const emailResult = await sendMail({ to: email, subject, text, html });

    if (!emailResult.success) {
      console.error('Failed to send password reset email:', emailResult.error);
      // Even if email fails, we don't want to reveal if the user exists or not.
      // The update to the DB was made, so if they try again and email works, it's fine.
      // Or, they might contact support.
      return NextResponse.json({ message: 'If an account with that email exists, a password reset code has been sent.' }, { status: 200 });
    }

    return NextResponse.json({ message: 'Password reset code sent successfully. Please check your email.' }, { status: 200 });

  } catch (error) {
    console.error('Request password reset error:', error);
    // Generic error for the client
    return NextResponse.json({ message: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
