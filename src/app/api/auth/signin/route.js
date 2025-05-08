import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { getCollection } from '@/lib/mongodb';

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Please define the JWT_SECRET environment variable inside .env.local');
}

export async function POST(request) {
  try {
    // Destructure intendedRole from the request body
    const { email, password, intendedRole } = await request.json(); 

    if (!email || !password || !intendedRole) {
      // Also check if intendedRole was provided
      return NextResponse.json({ message: 'Email, password, and intended role are required.' }, { status: 400 });
    }
    if (!['user', 'professional'].includes(intendedRole)) {
        // Validate intendedRole value
        return NextResponse.json({ message: 'Invalid intended role specified.' }, { status: 400 });
    }

    const usersCollection = await getCollection('users');
    const user = await usersCollection.findOne({ email });

    if (!user) {
      return NextResponse.json({ message: 'Invalid credentials. User not found.' }, { status: 401 });
    }

    // *** Add check for verification status ***
    if (!user.isVerified) {
        // Optionally trigger a resend here, or just inform the user
        return NextResponse.json({ 
            message: 'Account not verified. Please check your email for the verification code.',
            // Add a flag to indicate verification is needed on the frontend
            verificationRequired: true, 
            email: user.email // Send email back for potential resend action
        }, { status: 403 }); // 403 Forbidden
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials. Password incorrect.' }, { status: 401 });
    }

    // *** Add role check ***
    // The sign-in page uses 'user' for the customer role tab
    const actualRole = user.role === 'customer' ? 'user' : user.role; 
    if (actualRole !== intendedRole) {
        return NextResponse.json({ message: `Login failed: Please use the ${actualRole === 'user' ? 'User' : 'Professional'} Sign-In tab.` }, { status: 403 }); // 403 Forbidden
    }

    // Password and role are valid, create a JWT
    const tokenPayload = {
      userId: user._id.toString(), // Convert ObjectId to string
      email: user.email,
      name: user.name,
      role: user.role,
    };

    const token = jwt.sign(tokenPayload, JWT_SECRET, {
      expiresIn: '1d', // Token expires in 1 day (adjust as needed)
    });

    // Prepare user data to send back (excluding password)
    const userResponse = {
      _id: user._id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
    };
    if (user.role === 'professional') {
        userResponse.phoneNumber = user.phoneNumber;
        // Potentially other professional fields if needed on client immediately after login
    }


    return NextResponse.json({ 
      message: 'Sign in successful.', 
      token,
      user: userResponse 
    }, { status: 200 });

  } catch (error) {
    console.error('Signin API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
