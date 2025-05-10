import { NextResponse } from 'next/server';
import { getCollection } from '@/lib/mongodb';
import { ObjectId } from 'mongodb';

// Helper to convert HH:MM to total minutes from midnight
const timeToMinutes = (timeStr) => {
  if (!timeStr || !/^\d{2}:\d{2}$/.test(timeStr)) return 0;
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper to convert total minutes from midnight to HH:MM
const minutesToTime = (totalMinutes) => {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

// Helper to get day of the week (Capitalized string e.g., "Monday") from YYYY-MM-DD
const getDayOfWeekFromDate = (dateString) => {
    // Note: JavaScript's Date months are 0-indexed.
    // Day: 0 for Sunday, 1 for Monday, ..., 6 for Saturday
    const [year, month, day] = dateString.split('-').map(Number);
    // Ensure date is parsed as UTC to avoid timezone issues with getDay()
    const dateObj = new Date(Date.UTC(year, month - 1, day));
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[dateObj.getUTCDay()];
};


export async function GET(request, context) {
  const logPrefix = "[API available-slots]";
  try {
    const params = await context.params;
    const { id: professionalId } = params;
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date'); // YYYY-MM-DD
    const serviceDurationParam = searchParams.get('serviceDuration'); // in minutes

    console.log(`${logPrefix} Request received: professionalId=${professionalId}, date=${date}, serviceDurationParam=${serviceDurationParam}`);

    if (!professionalId || !ObjectId.isValid(professionalId)) {
      console.log(`${logPrefix} Invalid professionalId: ${professionalId}`);
      return NextResponse.json({ message: 'Valid professional ID is required' }, { status: 400 });
    }
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      console.log(`${logPrefix} Invalid date format: ${date}`);
      return NextResponse.json({ message: 'Valid date (YYYY-MM-DD) is required' }, { status: 400 });
    }
    if (!serviceDurationParam || isNaN(parseInt(serviceDurationParam)) || parseInt(serviceDurationParam) <= 0) {
      console.log(`${logPrefix} Invalid serviceDuration: ${serviceDurationParam}`);
      return NextResponse.json({ message: 'Valid service duration (positive number in minutes) is required' }, { status: 400 });
    }
    const serviceDuration = parseInt(serviceDurationParam);
    console.log(`${logPrefix} Parsed serviceDuration: ${serviceDuration} minutes`);

    const usersCollection = await getCollection('users');
    const professional = await usersCollection.findOne(
      { _id: new ObjectId(professionalId), role: 'professional' },
      { projection: { availability: 1, timezone: 1 } } 
    );

    if (!professional) {
      console.log(`${logPrefix} Professional not found for ID: ${professionalId}`);
      return NextResponse.json({ message: 'Professional not found' }, { status: 404 });
    }
    console.log(`${logPrefix} Fetched professional:`, JSON.stringify(professional));

    if (!professional.availability || !Array.isArray(professional.availability)) {
      console.log(`${logPrefix} Professional availability not set up correctly or not an array. Availability:`, JSON.stringify(professional.availability));
      return NextResponse.json({ message: 'Professional availability not set up correctly (must be an array).' }, { status: 404 });
    }
    
    const requestedDayName = getDayOfWeekFromDate(date);
    console.log(`${logPrefix} Requested date ${date} corresponds to day: ${requestedDayName}`);
    
    const daySchedule = professional.availability.find(d => d.day === requestedDayName);
    console.log(`${logPrefix} Found daySchedule for ${requestedDayName}:`, JSON.stringify(daySchedule));

    if (!daySchedule || !daySchedule.isAvailable || !daySchedule.startTime || !daySchedule.endTime) {
      console.log(`${logPrefix} No active schedule for ${requestedDayName}. isAvailable: ${daySchedule?.isAvailable}, startTime: ${daySchedule?.startTime}, endTime: ${daySchedule?.endTime}`);
      return NextResponse.json({ availableSlots: [], professionalTimezone: professional.timezone || 'UTC' }, { status: 200 });
    }

    console.log(`${logPrefix} Using schedule for ${requestedDayName}: Start=${daySchedule.startTime}, End=${daySchedule.endTime} (UTC)`);

    const availableSlots = [];
    const slotInterval = 15; 

    const periodStartMinutes = timeToMinutes(daySchedule.startTime);
    let periodEndMinutes = timeToMinutes(daySchedule.endTime); // Use let for potential modification
    console.log(`${logPrefix} Initial period in minutes (UTC): Start=${periodStartMinutes}, End=${periodEndMinutes}`);

    // Handle overnight shifts: if end time is earlier than start time, it means it's on the next day relative to start.
    if (periodEndMinutes < periodStartMinutes && daySchedule.endTime < daySchedule.startTime) { // Ensure it's a genuine overnight case
      periodEndMinutes += 24 * 60; // Add 24 hours in minutes
      console.log(`${logPrefix} Adjusted periodEndMinutes for overnight shift: ${periodEndMinutes}`);
    }
    
    console.log(`${logPrefix} Final period for slot generation (UTC minutes): Start=${periodStartMinutes}, End=${periodEndMinutes}`);

    for (let slotStartMinutes = periodStartMinutes; slotStartMinutes < periodEndMinutes; slotStartMinutes += slotInterval) {
      const slotEndMinutesRequired = slotStartMinutes + serviceDuration;
      // Use modulo to keep time within 0-1439 for HH:MM conversion if it crosses a day boundary in calculation
      // const displaySlotStart = minutesToTime(slotStartMinutes % (24 * 60));
      // const displaySlotEndRequired = minutesToTime(slotEndMinutesRequired % (24*60));
      // console.log(`${logPrefix} Checking slot: StartMin=${slotStartMinutes} (${displaySlotStart}), RequiredEndMin=${slotEndMinutesRequired} (${displaySlotEndRequired}) vs PeriodEndMin=${periodEndMinutes}`);

      if (slotEndMinutesRequired <= periodEndMinutes) {
        const slotTime = minutesToTime(slotStartMinutes % (24 * 60)); // Ensure time wraps around for HH:MM string
        availableSlots.push(slotTime);
        // console.log(`${logPrefix} Added slot: ${slotTime}`);
      } else {
        // const displaySlotStartForReject = minutesToTime(slotStartMinutes % (24 * 60));
        // const displayPeriodEndForReject = minutesToTime(periodEndMinutes % (24*60));
        // console.log(`${logPrefix} Slot ${displaySlotStartForReject} rejected: ends after periodEndMinutes (${displayPeriodEndForReject})`);
      }
    }
    
    // TODO: Filter out slots that conflict with already booked appointments.
    // This would involve:
    // 1. Fetching appointments for this professional on the given `date`.
    // 2. For each potential `slotStartMinutes` from `availableSlots`:
    //    a. Calculate its `slotEndMinutesRequired`.
    //    b. Check if the interval [slotStartMinutes, slotEndMinutesRequired) overlaps with any
    //       booked appointment's [bookedStartMinutes, bookedEndMinutes) interval.
    //    c. If it overlaps, remove the slot from `availableSlots`.
    // Note: Appointment times in DB are UTC. Professional's availability is local.
    // This check needs careful timezone handling: convert professional's local slots to UTC for comparison,
    // or convert booked UTC appointment times to professional's local timezone.
    // The `professional.timezone` field will be crucial here.

    // For now, returning slots based purely on availability schedule:
    const uniqueSlots = [...new Set(availableSlots)].sort(); 
    console.log(`${logPrefix} Generated unique UTC slots:`, JSON.stringify(uniqueSlots));
    console.log(`${logPrefix} Professional timezone from DB: ${professional.timezone}`);

    return NextResponse.json({ availableSlots: uniqueSlots, professionalTimezone: professional.timezone || 'UTC' }, { status: 200 });

  } catch (error) {
    console.error(`${logPrefix} Error:`, error);
    return NextResponse.json({ message: 'Internal server error', error: error.message }, { status: 500 });
  }
}
