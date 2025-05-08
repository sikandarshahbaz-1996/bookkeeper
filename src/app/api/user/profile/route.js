import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb'; // Import ObjectId

const JWT_SECRET = process.env.JWT_SECRET;

// Helper function to verify token and get user ID
async function verifyTokenAndGetUser(request) {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { error: 'Authorization header missing or invalid.', status: 401 };
    }
    const token = authHeader.split(' ')[1];

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (!decoded.userId) {
             return { error: 'Invalid token payload.', status: 401 };
        }
        
        const usersCollection = await getCollection('users');
        // Ensure userId is a valid ObjectId before querying
        if (!ObjectId.isValid(decoded.userId)) {
             return { error: 'Invalid user ID format in token.', status: 400 };
        }
        const user = await usersCollection.findOne({ _id: new ObjectId(decoded.userId) });

        if (!user) {
            return { error: 'User not found.', status: 404 };
        }
        
        // Exclude sensitive fields
        delete user.password;
        delete user.verificationCode;
        delete user.verificationCodeExpires;

        return { user };

    } catch (error) {
        if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
            return { error: `Invalid or expired token: ${error.message}`, status: 401 };
        }
        console.error("Token verification/DB error:", error);
        return { error: 'Internal server error during token verification.', status: 500 };
    }
}


// GET Handler - Fetch user profile
export async function GET(request) {
  const { user, error, status } = await verifyTokenAndGetUser(request);

  if (error) {
    return NextResponse.json({ message: error }, { status: status });
  }

  return NextResponse.json({ user }, { status: 200 });
}

// PUT Handler - Update user profile
export async function PUT(request) {
  const { user, error: authError, status: authStatus } = await verifyTokenAndGetUser(request);

  if (authError) {
    return NextResponse.json({ message: authError }, { status: authStatus });
  }

  try {
    const updateData = await request.json();

    // Fields allowed for update (prevent changing critical/sensitive data)
    const allowedUpdates = {
        name: updateData.name,
        phoneNumber: updateData.phoneNumber,
        // Professional specific fields (only allow update if user is professional)
        ...(user.role === 'professional' && {
            qualifications: updateData.qualifications,
            experience: updateData.experience,
            areasOfExpertise: updateData.areasOfExpertise,
            languagesSpoken: updateData.languagesSpoken,
            softwareProficiency: updateData.softwareProficiency,
        }),
    };

    // Remove undefined fields to avoid overwriting existing data with undefined
    Object.keys(allowedUpdates).forEach(key => allowedUpdates[key] === undefined && delete allowedUpdates[key]);

    // Basic validation (e.g., ensure name is not empty if provided)
    if (allowedUpdates.name !== undefined && !allowedUpdates.name.trim()) {
         return NextResponse.json({ message: 'Name cannot be empty.' }, { status: 400 });
    }
    // Add more specific validation as needed for arrays, phone number format etc.
    // Example: Ensure arrays are actually arrays if provided
    ['qualifications', 'experience', 'areasOfExpertise', 'languagesSpoken', 'softwareProficiency'].forEach(key => {
        if (allowedUpdates[key] !== undefined && !Array.isArray(allowedUpdates[key])) {
            delete allowedUpdates[key]; // Or return error
            console.warn(`Invalid non-array data provided for ${key}`);
        }
    });


    if (Object.keys(allowedUpdates).length === 0) {
         return NextResponse.json({ message: 'No valid fields provided for update.' }, { status: 400 });
    }

    // Add updatedAt timestamp
    allowedUpdates.updatedAt = new Date();

    const usersCollection = await getCollection('users');
    const result = await usersCollection.updateOne(
      { _id: user._id }, // Use the ObjectId from the verified user
      { $set: allowedUpdates }
    );

    if (result.modifiedCount > 0) {
      // Fetch the updated user data to return it (excluding sensitive fields)
      const updatedUser = await usersCollection.findOne({ _id: user._id });
      delete updatedUser.password;
      delete updatedUser.verificationCode;
      delete updatedUser.verificationCodeExpires;
      
      return NextResponse.json({ message: 'Profile updated successfully.', user: updatedUser }, { status: 200 });
    } else if (result.matchedCount > 0) {
        // Matched but didn't modify (likely same data submitted)
        return NextResponse.json({ message: 'Profile data is already up to date.', user: user }, { status: 200 });
    } 
    else {
      // This case should ideally not happen if verifyTokenAndGetUser worked
      return NextResponse.json({ message: 'Failed to find user to update.' }, { status: 404 });
    }

  } catch (error) {
    console.error('Update Profile API Error:', error);
    return NextResponse.json({ message: 'Internal Server Error', error: error.message }, { status: 500 });
  }
}
