import * as admin from "firebase-admin";
import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";

import { basicSorting } from "./sorting/basic/basic_sorting";

export const sortParticipantScheduledFunction = onSchedule(
  {
    schedule: "1,16,31,46 * * * *",
    timeZone: "Europe/Warsaw",
    region: "europe-west3",
  },
  async (_event: ScheduledEvent): Promise<void> => {
    const now = admin.firestore.Timestamp.now();
    
    await basicSorting(now);
  }
);