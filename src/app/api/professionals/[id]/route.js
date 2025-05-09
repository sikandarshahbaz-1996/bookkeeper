import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(request, context) {
  let idFromParams; // Declare idFromParams here to use in catch block if needed
  try {
    const params = await context.params;
    const { id } = params;
    idFromParams = id; 
    // console.log(`[API /api/professionals/${id}] Received ID: ${id}, Type: ${typeof id}`); // Reduced logging

    if (!id || !ObjectId.isValid(id)) {
      // console.log(`[API /api/professionals/${id}] Invalid ID format or ID not provided.`); // Reduced logging
      return NextResponse.json({ message: 'Valid professional ID is required' }, { status: 400 });
    }

    const objectIdToSearch = new ObjectId(id);
    // console.log(`[API /api/professionals/${id}] ObjectId created: ${objectIdToSearch.toString()}`); // Reduced logging

    const usersCollection = await getCollection('users'); 
    // const dbName = usersCollection.dbName; // Reduced logging
    // console.log(`[API /api/professionals/${id}] Connected to database: ${dbName}`); // Reduced logging
    // console.log(`[API /api/professionals/${id}] Got users collection. Searching for _id: ${objectIdToSearch.toString()} AND role: 'professional' in collection '${usersCollection.collectionName}' of database '${dbName}'`); // Reduced logging
    
    const professional = await usersCollection.findOne(
      { _id: objectIdToSearch, role: 'professional' }, // Ensure we fetch a user with role 'professional'
      // Re-add projection to exclude sensitive fields
      {
        projection: {
          password: 0,
          resetPasswordToken: 0,
          resetPasswordExpires: 0,
          emailVerified: 0,
          verificationToken: 0,
          verificationTokenExpires: 0,
          // Add any other user-specific fields that shouldn't be public for a professional profile
        },
      }
    );

    if (!professional) {
      // console.log(`[API /api/professionals/${id}] Professional with role 'professional' not found in users collection with _id: ${objectIdToSearch.toString()}`); // Reduced logging
      return NextResponse.json({ message: 'Professional not found' }, { status: 404 });
    }
    
    // console.log(`[API /api/professionals/${id}] Professional (from users collection) found. Raw data:`, JSON.stringify(professional)); // Reduced logging

    const professionalToSend = { ...professional };

    // Ensure areasOfExpertise (general skills) is an array of strings
    if (Array.isArray(professionalToSend.areasOfExpertise)) {
      professionalToSend.areasOfExpertise = professionalToSend.areasOfExpertise.filter(skill => typeof skill === 'string' && skill.trim() !== '');
    } else {
      professionalToSend.areasOfExpertise = [];
    }

    // Ensure servicesOffered is an array of objects with name and hourlyRate
    if (Array.isArray(professionalToSend.servicesOffered)) {
      professionalToSend.servicesOffered = professionalToSend.servicesOffered.filter(service => 
        service && 
        typeof service.name === 'string' && service.name.trim() !== '' &&
        typeof service.hourlyRate === 'number' && !isNaN(service.hourlyRate)
      );
    } else {
      // If it's not an array or doesn't exist, set to empty array
      professionalToSend.servicesOffered = [];
    }

    if (professionalToSend.address) {
      professionalToSend.location = `${professionalToSend.address.city || ''}${professionalToSend.address.city && professionalToSend.address.province ? ', ' : ''}${professionalToSend.address.province || ''}`.trim();
      if (!professionalToSend.location) delete professionalToSend.location;
      delete professionalToSend.address; // Remove full address object
    }
    
    // Explicitly remove other sensitive fields if they weren't handled by projection (though they should be)
    delete professionalToSend.password;
    delete professionalToSend.resetPasswordToken;
    delete professionalToSend.resetPasswordExpires;
    delete professionalToSend.emailVerified;
    delete professionalToSend.verificationToken;
    delete professionalToSend.verificationTokenExpires;
    // delete professionalToSend.email; 

    // console.log(`[API /api/professionals/${id}] Sending professional data:`, JSON.stringify(professionalToSend)); // Reduced logging
    return NextResponse.json(professionalToSend, { status: 200 });

  } catch (error) {
    console.error(`[API /api/professionals/${idFromParams || 'unknown_id'}] Error fetching professional by ID:`, error); // Keep essential error log
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
