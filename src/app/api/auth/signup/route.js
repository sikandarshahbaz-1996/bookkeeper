import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs'; // Corrected import
import { getCollection } from '@/lib/mongodb'; // Assuming @ refers to src

export async function POST(request) {
  try {
    const { name, email, password, role, phoneNumber, qualifications, experience, areasOfExpertise, languagesSpoken, softwareProficiency } = await request.json();

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
      return NextResponse.json({ message: 'User with this email already exists.' }, { status: 409 }); // 409 Conflict
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10); // Salt rounds: 10

    const newUser = {
      name,
      email,
      password: hashedPassword,
      role, // 'customer' or 'professional'
      createdAt: new Date(),
    };

    // Add professional-specific fields if the role is 'professional'
    if (role === 'professional') {
      newUser.phoneNumber = phoneNumber || ''; // Optional
      newUser.qualifications = qualifications || [];
      newUser.experience = experience || [];
      newUser.areasOfExpertise = areasOfExpertise || [];
      newUser.languagesSpoken = languagesSpoken || [];
      newUser.softwareProficiency = softwareProficiency || [];
    }
    
    const result = await usersCollection.insertOne(newUser);

    if (result.insertedId) {
      // Don't send back the password, even hashed, in the response
      const userResponse = { ...newUser };
      delete userResponse.password;
      return NextResponse.json({ message: 'User created successfully.', user: userResponse }, { status: 201 });
    } else {
      return NextResponse.json({ message: 'Failed to create user.' }, { status: 500 });
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
