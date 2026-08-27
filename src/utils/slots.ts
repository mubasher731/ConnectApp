/** Booking slot helpers — display and date formatting. */

/** Convert 24‑hour "HH:MM" to 12‑hour "h:mm AM/PM" for display. */
export const formatSlotDisplay = (slot24: string): string => {
  const [h, m] = slot24.split(':').map(Number);
  const hr = h % 12 || 12;
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
};

/** "YYYY-MM-DD" local date string for the API. */
export const dateKey = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};
