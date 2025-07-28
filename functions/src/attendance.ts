import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";

const db = admin.firestore();

/**
 * A scheduled Cloud Function that runs every 15 minutes to take an
 * "attendance snapshot" for events that are about to start.
 */
export const recordEventAttendance = onSchedule(
  {
    schedule: "4,19,34,48 * * * *",
    timeZone: "Europe/Warsaw",
    region: "europe-west3",
  },
  async (event: ScheduledEvent): Promise<void> => {
    logger.info(
      "Checking for event instances to process for attendance snapshot...",
      {
        scheduleTime: event.scheduleTime,
        region: "europe-west3",
      }
    );

    const now = admin.firestore.Timestamp.now();
    const twoHoursFromNow = admin.firestore.Timestamp.fromMillis(
      now.toMillis() + 2 * 60 * 60 * 1000
    );

    const eventInstancesQuery = db
      .collection("eventInstances")
      .where("eventStartDateTime", ">=", now)
      .where("eventStartDateTime", "<=", twoHoursFromNow);

    const eventsSnapshot = await eventInstancesQuery.get();

    if (eventsSnapshot.empty) {
      logger.info("No upcoming event instances found in the time window.");
      return;
    }

    const batch = db.batch();
    let operationsCount = 0;
    let eventsToProcessCount = 0;

    logger.info(
      `Found ${eventsSnapshot.size} total event instances in the time window. Filtering now...`
    );

    eventsSnapshot.forEach((doc) => {
      const eventData = doc.data();

      // Skip if this instance has already been processed.
      if (eventData.attendanceProcessed === true) {
        return;
      }

      eventsToProcessCount++;

      // Validate that the required fields exist before processing.
      if (
        !eventData.participants ||
        !eventData.groupId ||
        !eventData.eventStartDateTime
      ) {
        logger.warn(
          `Event instance ${doc.id} is missing required fields. Marking as processed to skip.`
        );
        batch.update(doc.ref, { attendanceProcessed: true });
        operationsCount++;
        return;
      }

      logger.info(
        `Processing event instance: "${eventData.title}" (${doc.id})`
      );
      const { participants, groupId, eventStartDateTime, spots } = eventData;
      const confirmedParticipants = participants.slice(0, spots);

      confirmedParticipants.forEach(
        (participant: { uid: string; displayName: string }) => {
          if (participant.uid) {
            const userRef = db.collection("users").doc(participant.uid);
            const fieldToUpdate = `attendanceHistory.${groupId}`;
            // Update the user's attendance history for this group.
            batch.update(userRef, { [fieldToUpdate]: eventStartDateTime });
            // TODO: Update only if it's a newer attendance record.
            operationsCount++;
            logger.info(
              `Scheduled attendance update for user "${participant.displayName}" for group ${groupId}.`
            );
          }
        }
      );

      // Mark this event instance as processed to prevent re-runs.
      batch.update(doc.ref, { attendanceProcessed: true });
      operationsCount++;
    });

    if (operationsCount > 0) {
      await batch.commit();
      logger.info(
        `Successfully processed ${eventsToProcessCount} event instances and committed ${operationsCount} database operations.`
      );
    } else {
      logger.info(
        "All event instances in the time window were already processed."
      );
    }

    return;
  }
);
