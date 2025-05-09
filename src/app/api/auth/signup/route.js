import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { getCollection } from '@/lib/mongodb';
import { sendVerificationEmail } from '@/lib/nodemailer'; // Import email utility
import crypto from 'crypto'; // For generating random code

export async function POST(request) {
  try {
    // Destructure servicesOffered (for services with rates) and areasOfExpertise (for general skill strings)
    const { name, email, password, role, phoneNumber, qualifications, experience, areasOfExpertise, servicesOffered, languagesSpoken, softwareProficiency } = await request.json();

    // Basic validation
    if (!name || !email || !password || !role) {
      return NextResponse.json({ message: 'Missing required fields (name, email, password, role).' }, { status: 400 });
    }
    if (password.length < 6) {
      return NextResponse.json({ message: 'Password must be at least 6 characters long.' }, { status: 400 });
    }
    if (!['customer', 'professional'].includes(role)) {
        return NextResponse.json({ message: 'Invalid role specified. Must be "customer" or "professional".' }, { status: 400 });
    }

    const usersCollection = await getCollection('users');

    // Check if user already exists
    const existingUser = await usersCollection.findOne({ email });
    if (existingUser) {
      // If user exists but is not verified, allow signup process to proceed to resend code
      if (existingUser && existingUser.isVerified) {
        return NextResponse.json({ message: 'User with this email already exists and is verified.' }, { status: 409 });
      }
      // If user exists but is not verified, we'll overwrite their verification code later.
    }

    // Generate verification code and expiry
    const verificationCode = crypto.randomInt(100000, 999999).toString(); // 6 digits
    const verificationCodeExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry
    const hashedVerificationCode = await bcrypt.hash(verificationCode, 10); // Hash the code

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Prepare user data
    const userData = {
      name,
      email,
      password: hashedPassword,
      role,
      isVerified: false, // Start as not verified
      verificationCode: hashedVerificationCode, // Store hashed code
      verificationCodeExpires,
      createdAt: existingUser ? existingUser.createdAt : new Date(), // Keep original creation date if user existed
      updatedAt: new Date(),
    };

    // Add professional-specific fields if the role is 'professional'
    if (role === 'professional') {
        userData.phoneNumber = phoneNumber || '';
        userData.qualifications = qualifications || [];
        userData.experience = experience || [];
        userData.areasOfExpertise = areasOfExpertise || []; // General skill strings
        userData.servicesOffered = servicesOffered || []; // Services with {name, hourlyRate}
        userData.languagesSpoken = languagesSpoken || [];
        userData.softwareProficiency = softwareProficiency || [];
    }

    // Use updateOne with upsert to handle both new users and existing unverified users
    const result = await usersCollection.updateOne(
        { email: email }, // Filter by email
        { $set: userData }, // Set the new data
        { upsert: true } // Create if doesn't exist, update if does
    );

    if (result.acknowledged) {
        // Send verification email
        const emailResult = await sendVerificationEmail(email, verificationCode); // Send the plain code

        if (!emailResult.success) {
            // Log error but proceed, user can request resend later
            console.error(`Failed to send verification email to ${email}: ${emailResult.error}`);
            // Optionally return a specific error, but maybe let signup succeed and prompt user
        }

        // Return success, prompting user to verify
        return NextResponse.json({ 
            message: 'Signup successful! Please check your email for a verification code.',
            // Optionally send back email for the verification page
            email: email 
        }, { status: 201 });

    } else {
        return NextResponse.json({ message: 'Failed to create or update user.' }, { status: 500 });
    }

  } catch (error) {
    console.error('Signup API Error:', error);
    // Check for MongoDB duplicate key error (though findOne should catch it)
    if (error.code === 11000) {
        return NextResponse.json({ message: 'User with this email already exists (duplicate key).' }, { status: 409 });
    }
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
