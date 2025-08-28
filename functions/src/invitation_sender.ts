import * as admin from "firebase-admin";
import { DocumentReference } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";

import { sendEmailInvites } from "./services/invitation";

// Define the EventInstance interface to match the data structure
interface Participant {
  uid: string;
}
interface EventInstance {
  spots: number;
  title: string;
  groupId: string;
  description: string;
  location: string;
  eventStartDateTime: admin.firestore.Timestamp;
  eventEndDateTime?: admin.firestore.Timestamp;
  participants: Participant[];
  participantsListProcessed?: boolean;
  calendarInvitesSent?: boolean;
  listRevealDateTime: admin.firestore.Timestamp;
}

/**
 * A scheduled function that queries for events that have been sorted
 * but have not yet had calendar invites sent out.
 */
export const sendCalendarInvitesScheduledFunction = onSchedule(
  {
    // Runs a few minutes after the sorting function
    schedule: "5,20,35,50 * * * *",
    timeZone: "Europe/Warsaw",
    region: "europe-west3",
  },
  async (_event: ScheduledEvent): Promise<void> => {
    const db = admin.firestore();
    const now = admin.firestore.Timestamp.now();
    logger.info("Checking for sorted events to send calendar invites...");

    // Backward Compatibility: Query a time window, then filter in code.
    const twoHoursAgo = admin.firestore.Timestamp.fromMillis(
      now.toMillis() - 2 * 60 * 60 * 1000
    );

    const querySnapshot = await db
      .collection("eventInstances")
      .where("listRevealDateTime", ">=", twoHoursAgo)
      .where("listRevealDateTime", "<=", now)
      .get();

    if (querySnapshot.empty) {
      logger.info(
        "No recent events found that might require calendar invitations."
      );
      return;
    }

    logger.info(
      `Found ${querySnapshot.size} recent events. Filtering for invites to send.`
    );

    for (const docSnap of querySnapshot.docs) {
      const instance = docSnap.data() as EventInstance;
      const instanceRef = docSnap.ref as DocumentReference<EventInstance>;

      // Filter for events that ARE sorted but have NOT had invites sent.
      // This handles cases where `calendarInvitesSent` is false or undefined.
      if (
        instance.participantsListProcessed !== true ||
        instance.calendarInvitesSent === true
      ) {
        continue;
      }

      try {
        await sendEmailInvites(
          db,
          instanceRef,
          instance,
          instance.participants
        );
      } catch (error) {
        logger.error(
          `An error occurred while processing invites for event ${docSnap.id}.`,
          error
        );
      }
    }
  }
);
