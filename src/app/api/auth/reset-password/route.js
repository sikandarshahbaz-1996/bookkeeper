import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import bcrypt from 'bcryptjs'; // Corrected import

export async function POST(request) {
  try {
    const { email, code, newPassword } = await request.json();

    if (!email || !/\S+@\S+\.\S+/.test(email)) {
      return NextResponse.json({ message: 'Valid email is required' }, { status: 400 });
    }
    if (!code || code.length !== 6 || !/^\d{6}$/.test(code)) {
      return NextResponse.json({ message: 'Valid 6-digit code is required' }, { status: 400 });
    }
    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json({ message: 'Password must be at least 8 characters long' }, { status: 400 });
    }

    let userCollection;
    let user;
    let userType = 'user';

    // Try finding in 'users' collection
    userCollection = await getCollection('users');
    user = await userCollection.findOne({ email });

    // If not found in 'users', try 'professionals' collection
    if (!user) {
      userCollection = await getCollection('professionals');
      user = await userCollection.findOne({ email });
      userType = 'professional';
    }

    if (!user) {
      return NextResponse.json({ message: 'Invalid email or code. Please try again.' }, { status: 400 });
    }

    // Check if the token exists and matches
    if (!user.resetPasswordToken || user.resetPasswordToken !== code) {
      return NextResponse.json({ message: 'Invalid or expired code. Please request a new one.' }, { status: 400 });
    }

    // Check if the token has expired
    if (!user.resetPasswordExpires || new Date() > new Date(user.resetPasswordExpires)) {
      // Clear the expired token
      const collectionToUpdate = userType === 'user' ? 'users' : 'professionals';
      const currentCollection = await getCollection(collectionToUpdate);
      await currentCollection.updateOne(
        { email: email },
        { $unset: { resetPasswordToken: "", resetPasswordExpires: "" } }
      );
      return NextResponse.json({ message: 'Code has expired. Please request a new one.' }, { status: 400 });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password and clear the reset token fields
    const collectionToUpdate = userType === 'user' ? 'users' : 'professionals';
    const currentCollection = await getCollection(collectionToUpdate);
    
    const updateResult = await currentCollection.updateOne(
      { email: email },
      { 
        $set: { password: hashedPassword },
        $unset: { resetPasswordToken: "", resetPasswordExpires: "" } 
      }
    );

    if (updateResult.modifiedCount === 0) {
        // This case should ideally not happen if all previous checks passed
        console.error(`Failed to update password for ${email}, though token was valid.`);
        return NextResponse.json({ message: 'Failed to update password. Please try again.' }, { status: 500 });
    }

    return NextResponse.json({ message: 'Password has been reset successfully.' }, { status: 200 });

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json({ message: 'An unexpected error occurred. Please try again.' }, { status: 500 });
  }
}
