import { NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb'; // Import ObjectId
// Removed listTimeZones import

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
            // Add business fields here
            businessName: updateData.businessName,
            businessAddress: updateData.businessAddress,
            businessPhone: updateData.businessPhone,
            businessEmail: updateData.businessEmail,
            servicesOffered: updateData.servicesOffered, 
            timezone: updateData.timezone, // Add timezone
            availability: updateData.availability, // Add availability
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
    const arrayFields = ['qualifications', 'experience', 'areasOfExpertise', 'languagesSpoken', 'softwareProficiency'];
    arrayFields.forEach(key => {
        if (allowedUpdates[key] !== undefined && !Array.isArray(allowedUpdates[key])) {
            console.warn(`Invalid non-array data provided for ${key}. Field will be ignored.`);
            delete allowedUpdates[key];
        }
    });

    // Validate servicesOffered structure
    if (allowedUpdates.servicesOffered !== undefined) {
        if (!Array.isArray(allowedUpdates.servicesOffered)) {
            console.warn(`Invalid non-array data provided for servicesOffered. Field will be ignored.`);
            delete allowedUpdates.servicesOffered;
        } else {
            allowedUpdates.servicesOffered = allowedUpdates.servicesOffered.filter(item => 
                item && typeof item.service === 'string' && item.service.trim() !== '' &&
                typeof item.rate === 'number' && !isNaN(item.rate) && item.rate >= 0
            );
        }
    }

    // Validate timezone (basic check: must be a non-empty string)
    // More robust validation could involve checking against a known list or regex,
    // but relying on client sending valid IANA string from Intl API is often sufficient.
    if (allowedUpdates.timezone !== undefined) {
        if (typeof allowedUpdates.timezone !== 'string' || allowedUpdates.timezone.trim() === '') {
            console.warn(`Invalid timezone provided: ${allowedUpdates.timezone}. Field will be ignored.`);
            delete allowedUpdates.timezone;
        } else {
             // Optional: Trim whitespace
             allowedUpdates.timezone = allowedUpdates.timezone.trim();
        }
    }

    // Validate availability structure
    const validTimeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/; // HH:mm format
    const daysOfWeekConst = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

    if (allowedUpdates.availability !== undefined) {
        if (!Array.isArray(allowedUpdates.availability) || allowedUpdates.availability.length !== 7) {
            console.warn(`Invalid availability data structure or length. Field will be ignored.`);
            delete allowedUpdates.availability;
        } else {
            allowedUpdates.availability = allowedUpdates.availability.map(daySchedule => {
                if (!daySchedule || typeof daySchedule.day !== 'string' || !daysOfWeekConst.includes(daySchedule.day) || typeof daySchedule.isAvailable !== 'boolean') {
                    return null; // Invalid entry
                }
                if (daySchedule.isAvailable) {
                    if (daySchedule.startTime === null && daySchedule.endTime === null) { // If available but times are explicitly null (e.g. from toggle off then on without setting)
                         // Keep them null, or set default? For now, keep as is, frontend should handle defaults if needed.
                         // Or, if API requires times for available days, this item should be marked invalid.
                         // For now, we assume null times are acceptable if isAvailable is true, meaning "available but times not set yet"
                         // However, the frontend logic converts to UTC HH:mm or null. So if it's available, it should have times.
                         // Let's enforce that if isAvailable is true, startTime and endTime must be valid UTC HH:mm strings.
                         // The frontend sends null if not available, or UTC HH:mm if available.
                         // So if isAvailable is true, startTime/endTime should not be null here from a valid client.
                         // If they are null, it's a data integrity issue or client error.
                         // For now, let's trust the client sends valid UTC HH:mm or null based on isAvailable.
                    } else if (
                        (daySchedule.startTime !== null && !validTimeRegex.test(daySchedule.startTime)) ||
                        (daySchedule.endTime !== null && !validTimeRegex.test(daySchedule.endTime))
                    ) {
                        console.warn(`Invalid time format for ${daySchedule.day}. Times will be nulled.`);
                        return { ...daySchedule, startTime: null, endTime: null }; // Or mark as invalid
                    }
                    // Further validation: endTime after startTime (complex with day rollovers if times are just HH:mm)
                    // For simplicity, assuming times are within the same day and client ensures start < end.
                } else {
                    // If not available, ensure times are null (client should do this)
                    daySchedule.startTime = null;
                    daySchedule.endTime = null;
                }
                return daySchedule;
            }).filter(Boolean); // Remove any null (invalid) entries

            if (allowedUpdates.availability.length !== 7) { // Check again after filtering
                 console.warn(`Availability data became invalid after filtering. Field will be ignored.`);
                 delete allowedUpdates.availability;
            }
        }
    }


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
