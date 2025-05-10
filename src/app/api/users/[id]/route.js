import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb'; // Changed import
import { ObjectId } from 'mongodb';

export async function GET(request, { params }) {
  try {
    const { id } = params;

    if (!ObjectId.isValid(id)) {
      return NextResponse.json({ message: 'Invalid user ID format' }, { status: 400 });
    }

    const usersCollection = await getCollection('users'); // Use getCollection
    const user = await usersCollection.findOne( // Use the collection directly
      { _id: new ObjectId(id) },
      { 
        projection: { 
          password: 0, 
          emailVerificationToken: 0, 
          emailVerificationExpires: 0, 
          resetPasswordToken: 0, 
          resetPasswordExpires: 0 
        } 
      } // Exclude sensitive fields
    );

    if (!user) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    // Optional: You might want to add a check here to ensure the role is 'user'
    // if (user.role !== 'user') {
    //   return NextResponse.json({ message: 'Profile does not belong to a customer' }, { status: 403 });
    // }

    return NextResponse.json(user, { status: 200 });
  } catch (error) {
    console.error('Error fetching user profile by ID:', error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
