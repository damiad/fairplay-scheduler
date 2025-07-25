import * as admin from "firebase-admin";
import { EventInstance } from "../../../../types";

export async function basicSorting(now: admin.firestore.Timestamp): Promise<void> {

    const db = admin.firestore();

    const querySnapshot = await db
        .collection("eventInstances")
        .where("listRevealDateTime", "<=", now)
        .where("participantsListProcessed", "!=", true)
        .get();

    const instancesToProcess = querySnapshot.docs;

    //TODO: use batch update?
    for (const docSnap of instancesToProcess) {
        const instanceRef = docSnap.ref;
        const instance = docSnap.data() as EventInstance;
        const { participants = [], listRevealDateTime, eventId, participantsListProcessed } = instance;

        if (now.toMillis() < listRevealDateTime.toMillis() || participantsListProcessed) {
            console.log(
                `Skipping eventInstance ${docSnap.id} due to participantsListProcessed:${participantsListProcessed} or future listRevealDateTime(${listRevealDateTime})`
            );
            continue;
        }

        try {
            const userDocs = await Promise.all(
                participants.map((p) => db.collection("users").doc(p.uid).get())
            );

            const enriched = participants.map((p, i) => {
                const user = userDocs[i].data();
                const lastParticipation = user?.attendanceHistory?.[eventId] ?? null;
                const isLate = p.registeredAt.toMillis() > listRevealDateTime.toMillis();
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

            await instanceRef.update({
                participants: sortedParticipants,
                participantsListProcessed: true,
            });
        } catch (error) {
            console.error(`Failed to process eventInstance ${docSnap.id}:`, error);
        }
    }
}