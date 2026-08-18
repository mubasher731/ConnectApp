/** Shared time-slot generation for the patient booking flow. */

/** Format a minute-of-day as "10:00am" (lowercase, zero-padded minutes). */
export const formatMinutes = (total: number): string => {
  const h = Math.floor(total / 60);
  const m = total % 60;
  const ampm = h >= 12 ? 'pm' : 'am';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')}${ampm}`;
};

/** 15-minute interval session slots, e.g. "10:00am - 10:15am". */
export const generateTimeSlots = (
  startMin = 9 * 60,
  endMin = 17 * 60,
  stepMin = 15
): string[] => {
  const slots: string[] = [];
  for (let t = startMin; t < endMin; t += stepMin) {
    slots.push(`${formatMinutes(t)} - ${formatMinutes(t + stepMin)}`);
  }
  return slots;
};

export const TIME_SLOTS: string[] = generateTimeSlots();
