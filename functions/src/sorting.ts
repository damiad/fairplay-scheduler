import * as admin from "firebase-admin";
import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";

import { basicSorting } from "./sorting/basic/basic_sorting";

export const sortParticipantScheduledFunction = onSchedule(
  "every 15 minutes",
  async (_event: ScheduledEvent): Promise<void> => {
    const now = admin.firestore.Timestamp.now();
    
    await basicSorting(now);
  }
);