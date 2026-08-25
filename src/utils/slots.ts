/** Booking slot helpers — built from the doctor's weekly availability. */

/** Session length in minutes — MUST match backend SESSION_DURATION_MINUTES (15). */
export const SESSION_DURATION_MINUTES = 15;

/** Minutes between bookable slot starts (09:00, 09:30, 10:00 ...). */
export const SLOT_STEP_MINUTES = 30;

export interface AvailabilityWindow {
  day_of_week: number;
  start_time: string;
  end_time: string;
}

/** Generate step-minute "HH:MM" slots within a window. */
export const buildDaySlots = (
  start: string,
  end: string,
  step = SLOT_STEP_MINUTES
): string[] => {
  const toMin = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    return (h || 0) * 60 + (m || 0);
  };
  const fmt = (min: number) =>
    `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const out: string[] = [];
  for (let t = toMin(start); t < toMin(end); t += step) out.push(fmt(t));
  return out;
};

/** Slots for a given date from weekly availability (empty if no window that day). */
export const daySlotsFor = (
  availability: AvailabilityWindow[],
  date: Date
): string[] => {
  const day = availability.find((a) => a.day_of_week === date.getDay());
  return day ? buildDaySlots(day.start_time, day.end_time) : [];
};

/** Whether a "HH:MM" slot has already passed (only relevant for today). */
export const isPastSlot = (slot: string, date: Date, now = new Date()): boolean => {
  if (date.toDateString() !== now.toDateString()) return false;
  const [h, m] = slot.split(':').map(Number);
  return (h || 0) * 60 + (m || 0) <= now.getHours() * 60 + now.getMinutes();
};

/** Convert 24‑hour "HH:MM" to 12‑hour "h:mm AM/PM" for display. */
export const formatSlotDisplay = (slot24: string): string => {
  const [h, m] = slot24.split(':').map(Number);
  const hr = h % 12 || 12; // 0 becomes 12 (midnight/noon)
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
};

/** Convert 12‑hour display string to 24‑hour "HH:MM" for the API. */
export const parseSlot24 = (slotDisplay: string): string => {
  const [time, ampm] = slotDisplay.split(' ');
  let [h, m] = time.split(':').map(Number);
  if (ampm === 'PM' && h !== 12) h += 12;
  if (ampm === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};

/** "YYYY-MM-DD" local date string for the API. */
export const dateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
