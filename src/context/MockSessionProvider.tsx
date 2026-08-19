import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import dayjs from 'dayjs';
import { useAuth } from './AuthContext';
import { mockSessionStore, MockSession } from '../services/mockSessionStore';
import { mockNotificationCenter } from '../services/mockNotificationCenter';
import { navigate } from '../navigation/navigationRef';

const MINUTE = 60_000;

/**
 * Global mock-session engine (no backend yet).
 *
 * While a user is logged in it ticks once per second and:
 *  1. Transitions mock sessions: scheduled -> active (at start) and
 *     active -> completed (at end, once extensions are applied).
 *  2. Fires the pre-session reminder exactly 5 minutes before a scheduled
 *     session starts — for the patient AND the doctor — as a local
 *     notification with an action button ("Join Session" / "View Details").
 *
 * Replace this whole provider with real backend endpoints when ready.
 */
export const MockSessionProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    // Seed a past conversation (only for the demo patient) so the
    // "Previous Sessions" history separator is immediately visible.
    mockSessionStore
      .ensureSeed({ id: user.id, name: user.name ?? '' })
      .catch(() => {});

    const tick = async () => {
      if (!user?.id) return;
      try {
        const sessions = await mockSessionStore.listSessionsForUser(user.id);
        const now = Date.now();
        const isDoctor = user.role_id === 3;

        for (const session of sessions) {
          const start = dayjs(session.scheduledStart).valueOf();
          const endAt =
            start + (session.durationMinutes + session.extendedBy) * MINUTE;

          // Status transitions.
          if (session.status === 'scheduled' && now >= start) {
            await mockSessionStore.updateSession(session.id, { status: 'active' });
          } else if (session.status === 'active' && now >= endAt) {
            await mockSessionStore.updateSession(session.id, { status: 'completed' });
          }

          // 5-minute pre-session reminder (fires once per session).
          const fiveBefore = start - 5 * MINUTE;
          const remindedKey = `${session.id}:start-reminder`;
          const inReminderWindow = now >= fiveBefore && now < start;
          if (
            session.status === 'scheduled' &&
            inReminderWindow &&
            !(await mockSessionStore.hasFiredReminder(remindedKey))
          ) {
            await mockSessionStore.markReminderFired(remindedKey);
            fireStartReminder(session, isDoctor);
          }
        }
      } catch (err) {
        // Never let storage hiccups break the app — retry next tick.
        console.warn('[mock-session] tick failed:', err);
      }
    };

    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const fireStartReminder = (session: MockSession, isDoctor: boolean) => {
    const timeLabel = dayjs(session.scheduledStart).format('h:mm A');
    const title = isDoctor ? '⏰ Upcoming Session' : '⏰ Session Starting Soon';
    const body = isDoctor
      ? `Your session with ${session.patientName} starts in 5 minutes`
      : `Your session with Dr. ${session.doctorName.replace(/^Dr\.\s*/, '')} starts in 5 minutes at ${timeLabel}`;

    mockNotificationCenter
      .add(
        isDoctor ? 'appointment' : 'reminder',
        title,
        body,
        { userId: user?.id, role: isDoctor ? 'doctor' : 'patient' }
      )
      .catch(() => {});

    Alert.alert(title, body, [
      { text: 'Later', style: 'cancel' },
      {
        text: isDoctor ? 'View Details' : 'Join Session',
        onPress: () =>
          navigate('ChatDetail', {
            chatId: session.id,
            participantName: isDoctor ? session.patientName : session.doctorName,
            isMock: true,
          }),
      },
    ]);
  };

  return <>{children}</>;
};
