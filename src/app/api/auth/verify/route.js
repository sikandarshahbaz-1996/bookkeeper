import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCollection } from '@/lib/mongodb';

export async function POST(request) {
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json({ message: 'Email and verification code are required.' }, { status: 400 });
    }

    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
        return NextResponse.json({ message: 'Invalid code format. Must be 6 digits.' }, { status: 400 });
    }

    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: 'User not found.' }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json({ message: 'Email is already verified.' }, { status: 400 });
    }

    // Check if code exists and hasn't expired
    if (!user.verificationCode || !user.verificationCodeExpires) {
        return NextResponse.json({ message: 'No verification code found for this user or code expired.' }, { status: 400 });
    }
    if (new Date() > user.verificationCodeExpires) {
        // Optionally: Clear expired code here? Or let resend handle it.
        return NextResponse.json({ message: 'Verification code has expired. Please request a new one.' }, { status: 400 });
    }

    // Compare the provided code with the hashed code in the database
    const isCodeValid = await bcrypt.compare(code, user.verificationCode);

    if (!isCodeValid) {
      return NextResponse.json({ message: 'Invalid verification code.' }, { status: 400 });
    }

    // Code is valid and not expired, update user
    const result = await usersCollection.updateOne(
      { _id: user._id },
      { 
        $set: { isVerified: true, updatedAt: new Date() },
        $unset: { verificationCode: "", verificationCodeExpires: "" } // Clear verification fields
      }
    );

    if (result.modifiedCount > 0) {
      return NextResponse.json({ message: 'Email verified successfully.' }, { status: 200 });
    } else {
      // This might happen if the user was somehow already verified between checks
      const updatedUser = await usersCollection.findOne({ _id: user._id });
      if (updatedUser && updatedUser.isVerified) {
         return NextResponse.json({ message: 'Email already verified.' }, { status: 200 });
      }
      return NextResponse.json({ message: 'Failed to update verification status.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Verification API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
