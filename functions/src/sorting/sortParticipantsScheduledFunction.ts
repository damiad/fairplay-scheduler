import * as admin from "firebase-admin";
import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";
import { basicSorting } from "./basic/basic_sorting";


export const sortParticipantScheduledFunction = onSchedule(
    {
        region: "europe-west3",
        schedule: "every 15 minutes",
    },
    async (_event: ScheduledEvent): Promise<void> => {
        const now = admin.firestore.Timestamp.now();

        //based on env variable, we can change the sorting impl from here
        await basicSorting(now);
    }
);
