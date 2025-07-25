import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { Timestamp } from "firebase/firestore";

export interface Participant {
  uid: string;
  displayName: string;
  photoURL: string;
  isOrganizer: boolean;
  registeredAt: Timestamp;
}

interface EventInstance {
  id: string;
  eventId: string;
  groupId: string;
  title: string;
  description: string;
  location: string;
  spots: number;
  eventStartDateTime: Timestamp;
  registrationOpenDateTime: Timestamp;
  listRevealDateTime: Timestamp;
  participants: Participant[];
  participantsListProcessed?: boolean;
  attendanceProcessed?: boolean;
}

export async function basicSorting(
  now: admin.firestore.Timestamp
): Promise<void> {
  const db = admin.firestore();

  const twoHoursAgo = admin.firestore.Timestamp.fromMillis(
    now.toMillis() - 2 * 60 * 60 * 1000
  );

  // 2. Query only within the time window. This is more efficient.
  //    We remove the filter on 'participantsListProcessed' to make it backward-compatible.
  const querySnapshot = await db
    .collection("eventInstances")
    .where("listRevealDateTime", ">=", twoHoursAgo)
    .where("listRevealDateTime", "<=", now)
    .get();

  if (querySnapshot.empty) {
    logger.info(
      "basicSorting: No instances found in the last 2 hours to process."
    );
    return;
  }

  const batch = db.batch();
  let operationsCount = 0;

  for (const docSnap of querySnapshot.docs) {
    const instanceRef = docSnap.ref;
    const instance = docSnap.data() as EventInstance;

    // 3. Backward Compatibility Filter: Check for the flag in the code.
    //    This processes docs where the field is `false` OR does not exist.
    if (instance.participantsListProcessed === true) {
      continue;
    }

    try {
      const { participants = [], eventId, listRevealDateTime } = instance;
      const userDocs = await Promise.all(
        participants.map((p) => db.collection("users").doc(p.uid).get())
      );

      const enriched = participants.map((p, i) => {
        const user = userDocs[i].data();
        const lastParticipation = user?.attendanceHistory?.[eventId] ?? null;
        const isLate =
          p.registeredAt.toMillis() > listRevealDateTime.toMillis();
        return {
          ...p,
          isLate,
          lastParticipation,
        };
      });

      const sortedParticipants = enriched.sort((a, b) => {
        if (a.isOrganizer && !b.isOrganizer) return -1;
        if (!a.isOrganizer && b.isOrganizer) return 1;

        const aTime = a.lastParticipation?.toMillis?.() ?? 0;
        const bTime = b.lastParticipation?.toMillis?.() ?? 0;

        if (aTime !== bTime) return aTime - bTime;
        return Math.random() < 0.5 ? -1 : 1;
      });

      batch.update(instanceRef, {
        participants: sortedParticipants,
        participantsListProcessed: true,
      });
      operationsCount++;
    } catch (error) {
      logger.error(`Failed to process eventInstance ${docSnap.id}:`, error);
    }
  }

  if (operationsCount > 0) {
    await batch.commit();
    logger.info(
      `basicSorting: Successfully processed and committed ${operationsCount} operations.`
    );
  }
}
