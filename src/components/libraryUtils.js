/**
 * Hours formats handled:
 * - "Closed" - Library is closed for the day
 * - "24 Hours" - Open all day
 * - "10am - 4pm" - Standard single session
 * - "9am - 1pm. 2pm - 5pm" - Multiple sessions (gap between = closed)
 * - "Open from 10am" - Opens at time, closes at midnight
 * - "Open until 10pm" - Opens at midnight, closes at time
 * - "Gallery 9am - 5pm" - Prefixed text stripped, parsed as "9am - 5pm"
 * - Empty/undefined - Treated as closed
 */

export const DAY_COLUMNS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Parses a time string like "10am" or "4pm" into minutes since midnight
 * @param {string} timeStr - Time string (e.g., "10am", "4pm", "12pm")
 * @returns {number} Minutes since midnight (e.g., "2pm" = 840)
 */
function parseTimeToMinutes(timeStr) {
  const cleaned = timeStr.toLowerCase().trim();
  const match = cleaned.match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)$/);
  if (!match) return null;

  let hours = parseInt(match[1], 10);
  const minutes = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3];

  // Convert to 24-hour format
  if (period === 'pm' && hours !== 12) hours += 12;
  if (period === 'am' && hours === 12) hours = 0;

  return hours * 60 + minutes;
}

/**
 * Parses hours string into array of {open, close} session objects
 * Handles multiple sessions separated by ". " (e.g., "9am - 1pm. 2pm - 5pm")
 * @param {string} hoursString - Raw hours string from CSV
 * @returns {Array<{open: number, close: number}>} Array of sessions in minutes
 */
function parseHoursSessions(hoursString) {
  if (!hoursString) return [];

  const normalized = hoursString.trim().toLowerCase();
  if (normalized === 'closed' || normalized === '') return [];
  if (normalized === '24 hours') return [{ open: 0, close: 1440 }]; // Full day

  // Handle "Open from Xam" format
  const openFromMatch = hoursString.match(/open from (\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
  if (openFromMatch) {
    const openTime = parseTimeToMinutes(openFromMatch[1]);
    if (openTime !== null) return [{ open: openTime, close: 1439 }]; // Until 11:59pm
  }

  // Handle "Open until Xpm" format
  const openUntilMatch = hoursString.match(/open until (\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
  if (openUntilMatch) {
    const closeTime = parseTimeToMinutes(openUntilMatch[1]);
    if (closeTime !== null) return [{ open: 0, close: closeTime }];
  }

  // Split by ". " for multiple sessions (e.g., "9am - 1pm. 2pm - 5pm")
  const sessionStrings = hoursString.split(/\.\s+/);
  const sessions = [];

  for (const session of sessionStrings) {
    // Extract time range pattern, stripping any prefix text (e.g., "Gallery 9am - 5pm")
    const rangeMatch = session.match(/(\d{1,2}(?::\d{2})?\s*(?:am|pm))\s*-\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm))/i);
    if (rangeMatch) {
      const open = parseTimeToMinutes(rangeMatch[1]);
      let close = parseTimeToMinutes(rangeMatch[2]);
      if (open !== null && close !== null) {
        // Handle midnight: "8am - 12am" means close at end of day
        if (close === 0) close = 1440;
        sessions.push({ open, close });
      }
    }
  }

  return sessions;
}

/**
 * Determines library status based on current EST time
 * @param {Object} library - Library object with day columns
 * @param {Date} currentTime - Current time (will be converted to EST)
 * @returns {'open' | 'closing' | 'closed'} Status for indicator color
 */
export function getLibraryStatus(library, currentTime) {
  // Convert to EST
  const estTime = new Date(currentTime.toLocaleString('en-US', { timeZone: 'America/New_York' }));
  const dayIndex = estTime.getDay();
  const hoursString = library[DAY_COLUMNS[dayIndex]];
  const currentMinutes = estTime.getHours() * 60 + estTime.getMinutes();

  const sessions = parseHoursSessions(hoursString);
  if (sessions.length === 0) return 'closed';

  // Check if currently within any session
  for (const session of sessions) {
    if (currentMinutes >= session.open && currentMinutes < session.close) {
      // Within this session - check if closing soon (within 60 min)
      if (session.close - currentMinutes <= 60) {
        return 'closing';
      }
      return 'open';
    }
  }

  return 'closed';
}
