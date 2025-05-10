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
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Ensure JWT_SECRET is in .env
    return decoded.userId; // Assuming your JWT payload has userId
  } catch (error) {
    console.error('Invalid token:', error.message);
    return null;
  }
}

export async function GET(request) {
  try {
    const userId = await getUserIdFromToken(request);
    if (!userId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const usersCollection = await getCollection('users');
    const currentUser = await usersCollection.findOne({ _id: new ObjectId(userId) }, { projection: { role: 1 } });

    if (!currentUser) {
      return NextResponse.json({ message: 'User not found' }, { status: 404 });
    }

    const appointmentsCollection = await getCollection('appointments');
    let query = {};

    if (currentUser.role === 'customer') {
      query = { customerId: new ObjectId(userId) };
    } else if (currentUser.role === 'professional') {
      query = { professionalId: new ObjectId(userId) };
    } else {
      return NextResponse.json({ message: 'User role not supported for appointments' }, { status: 400 });
    }

    const appointments = await appointmentsCollection.aggregate([
      { $match: query },
      { $sort: { appointmentDate: 1, startTime: 1 } },
      // Populate customer details
      {
        $lookup: {
          from: 'users',
          localField: 'customerId',
          foreignField: '_id',
          as: 'customerDetails',
          pipeline: [
            { $project: { name: 1, email: 1, phoneNumber: 1 } } // Only fetch needed fields
          ]
        }
      },
      { $unwind: { path: '$customerDetails', preserveNullAndEmptyArrays: true } },
      // Populate professional details
      {
        $lookup: {
          from: 'users',
          localField: 'professionalId',
          foreignField: '_id',
          as: 'professionalDetails',
          pipeline: [
            { $project: { name: 1, email: 1, businessName: 1, businessPhone: 1 } } // Only fetch needed fields
          ]
        }
      },
      { $unwind: { path: '$professionalDetails', preserveNullAndEmptyArrays: true } },
      // Add more stages if needed, e.g., for formatting dates or times for display (though client-side is often better)
    ]).toArray();

    return NextResponse.json({ appointments }, { status: 200 });

  } catch (error) {
    console.error('[API /api/appointments/me GET] Error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
        return NextResponse.json({ message: 'Invalid or expired token' }, { status: 401 });
    }
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
