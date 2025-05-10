import { NextResponse } from 'next/server';
import clientPromise from '@/lib/mongodb';
import { ObjectId } from 'mongodb';
// Assuming you have a way to get the current user's session/ID
// This should align with how `getCurrentUserId` is implemented in other API routes.
// For example, if using NextAuth.js and `getServerSession`
// import { getServerSession } from "next-auth/next"; // Commented out due to Module Not Found error
// import { authOptions } from "@/app/api/auth/[...nextauth]/route"; // Adjust path as needed

// Placeholder for actual session retrieval - replace with your auth logic
// IMPORTANT: This function currently relies on 'x-user-id' header.
// You MUST replace this with your actual secure session retrieval logic (e.g., NextAuth.js getServerSession).
async function getCurrentUserIdFromSession(req) {
  const userIdFromHeader = req.headers.get('x-user-id');
  if (userIdFromHeader) {
    try {
      return new ObjectId(userIdFromHeader);
    } catch (error) {
      console.error("Invalid user ID format in 'x-user-id' header:", error);
      return null;
    }
  }
  console.warn("No 'x-user-id' header found. Authentication will fail for /api/reviews/me.");
  return null;
}


export async function GET(req) {
  try {
    const client = await clientPromise;
    const db = client.db();

    const currentUserId = await getCurrentUserIdFromSession(req); // Implement this based on your auth
    if (!currentUserId) {
      return NextResponse.json({ message: 'Authentication required' }, { status: 401 });
    }

    const reviews = await db.collection('reviews')
      .find({ customerId: currentUserId })
      .sort({ createdAt: -1 })
      .toArray();

    return NextResponse.json({ reviews }, { status: 200 });

  } catch (error) {
    console.error('Failed to fetch user reviews:', error);
    return NextResponse.json({ message: 'Failed to fetch user reviews', error: error.message }, { status: 500 });
  }
}
