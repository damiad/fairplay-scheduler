// functions/src/sorting.ts

import * as admin from "firebase-admin";
import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";

import { basicSorting } from "./sorting/basic/basic_sorting";

// Assuming this file exists

export const sortParticipantScheduledFunction = onSchedule(
  // The schedule is now inherited from global options but can be overridden.
  "every 15 minutes",
  async (_event: ScheduledEvent): Promise<void> => {
    const now = admin.firestore.Timestamp.now();
    
    // Based on env variable, we can change the sorting impl from here.
    await basicSorting(now);
  }
);