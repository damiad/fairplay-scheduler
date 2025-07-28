// functions/src/attendance.ts

import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";

const db = admin.firestore();

/**
 * A scheduled Cloud Function that runs every 15 minutes to take an
 * "attendance snapshot" for events that are about to start. It updates
 * each confirmed participant's attendance history for their group, respecting
 * the event's spot limit.
 */
export const recordEventAttendance = onSchedule(
  "every 15 minutes",
  async (event: ScheduledEvent): Promise<void> => {
    logger.info("Checking for events to process for attendance snapshot...", {
      scheduleTime: event.scheduleTime,
    });

    const now = admin.firestore.Timestamp.now();
    const twoHoursFromNow = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 2 * 60 * 60 * 1000,
    );

    const eventsQuery = db.collection("events")
      .where("eventStartDateTime", ">=", now)
      .where("eventStartDateTime", "<=", twoHoursFromNow);

    const eventsSnapshot = await eventsQuery.get();

    if (eventsSnapshot.empty) {
      logger.info("No upcoming events found in the time window.");
      return;
    }

    const batch = db.batch();
    let operationsCount = 0;
    let eventsToProcessCount = 0;

    logger.info(`Found ${eventsSnapshot.size} total events in the time window. Filtering now...`);

    eventsSnapshot.forEach((doc) => {
      const eventData = doc.data();

      // Skip events that have already been processed
      if (eventData.attendanceProcessed === true) {
        return;
      }

      eventsToProcessCount++;

      // Ensure event has the required data before processing
      // Added a check for 'spots' as well
      if (!eventData.participants || !eventData.groupId || !eventData.eventStartDateTime || typeof eventData.spots !== 'number') {
        logger.warn(`Event ${doc.id} is missing required fields (participants, groupId, eventStartDateTime, or spots). Marking as processed to skip.`);
        batch.update(doc.ref, { attendanceProcessed: true });
        operationsCount++;
        return;
      }

      logger.info(`Processing event: "${eventData.title}" (${doc.id})`);
      const { participants, groupId, eventStartDateTime, spots } = eventData;

      // Slice the participants array to get only the confirmed attendees
      const confirmedParticipants = participants.slice(0, spots);
      logger.info(`Event has ${spots} spots. Processing ${confirmedParticipants.length} confirmed participants out of ${participants.length} total signups.`);

      // Update the attendance history for each CONFIRMED participant
      confirmedParticipants.forEach((participant: { uid: string; displayName: string; }) => {
        if (participant.uid) {
          const userRef = db.collection("users").doc(participant.uid);
          const fieldToUpdate = `attendanceHistory.${groupId}`;
          batch.update(userRef, { [fieldToUpdate]: eventStartDateTime });
          operationsCount++;
          logger.info(`Scheduled attendance update for user "${participant.displayName}" for group ${groupId}.`);
        }
      });

      // Mark the event as processed to prevent it from being run again
      batch.update(doc.ref, { attendanceProcessed: true });
      operationsCount++;
    });

    if (operationsCount > 0) {
      await batch.commit();
      logger.info(`Successfully processed ${eventsToProcessCount} events and committed ${operationsCount} database operations.`);
    } else {
      logger.info("All events in the time window were already processed.");
    }
  },
);