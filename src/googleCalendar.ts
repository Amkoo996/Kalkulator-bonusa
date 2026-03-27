import { auth } from './firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

const CALENDAR_API_URL = 'https://www.googleapis.com/calendar/v3/calendars/primary/events';

// Function to get a fresh access token with Calendar scopes
export const getCalendarToken = async (): Promise<string | null> => {
  try {
    const provider = new GoogleAuthProvider();
    provider.addScope('https://www.googleapis.com/auth/calendar.events');
    // Force select account to ensure we get the consent screen if needed, 
    // but usually it's seamless if already granted.
    provider.setCustomParameters({ prompt: 'consent' });
    
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    
    if (credential && credential.accessToken) {
      // Store token and expiry (1 hour)
      const expiry = new Date().getTime() + 3500 * 1000; // 3500 seconds
      localStorage.setItem('gcal_token', credential.accessToken);
      localStorage.setItem('gcal_token_expiry', expiry.toString());
      return credential.accessToken;
    }
    return null;
  } catch (error) {
    console.error("Error getting calendar token:", error);
    return null;
  }
};

export const getValidToken = async (): Promise<string | null> => {
  const token = localStorage.getItem('gcal_token');
  const expiry = localStorage.getItem('gcal_token_expiry');
  
  if (token && expiry && new Date().getTime() < parseInt(expiry)) {
    return token;
  }
  
  // Token expired or doesn't exist, need to re-auth
  return await getCalendarToken();
};

export const addEventToCalendar = async (
  date: string, 
  startTime: string, 
  endTime: string, 
  type: 'regular' | 'slobodan_dan'
): Promise<string | null> => {
  const token = await getValidToken();
  if (!token) return null;

  const summary = type === 'slobodan_dan' ? 'Slobodan dan' : 'Smjena na poslu';
  const description = type === 'slobodan_dan' ? 'Plaćeni slobodan dan (9h)' : 'Radna smjena';
  
  let startDateTime, endDateTime;
  
  if (type === 'slobodan_dan') {
    // All day event
    startDateTime = { date: date };
    // End date is exclusive in Google Calendar for all-day events
    const nextDay = new Date(date);
    nextDay.setDate(nextDay.getDate() + 1);
    endDateTime = { date: nextDay.toISOString().split('T')[0] };
  } else {
    // Specific time event
    const start = new Date(`${date}T${startTime}:00`);
    let end = new Date(`${date}T${endTime}:00`);
    
    // Handle overnight shifts
    if (end < start) {
      end.setDate(end.getDate() + 1);
    }
    
    startDateTime = { dateTime: start.toISOString() };
    endDateTime = { dateTime: end.toISOString() };
  }

  const event = {
    summary,
    description,
    start: startDateTime,
    end: endDateTime,
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: 60 }, // Remind 1 hour before
        { method: 'popup', minutes: 24 * 60 }, // Remind 1 day before
      ],
    },
  };

  try {
    const response = await fetch(CALENDAR_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(event),
    });

    if (!response.ok) {
      throw new Error('Failed to create event');
    }

    const data = await response.json();
    return data.id; // Return the Google Calendar Event ID
  } catch (error) {
    console.error("Error adding to calendar:", error);
    return null;
  }
};

export const deleteEventFromCalendar = async (eventId: string): Promise<boolean> => {
  const token = await getValidToken();
  if (!token) return false;

  try {
    const response = await fetch(`${CALENDAR_API_URL}/${eventId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    return response.ok || response.status === 410; // 410 means already deleted
  } catch (error) {
    console.error("Error deleting from calendar:", error);
    return false;
  }
};
