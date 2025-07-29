import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { onSchedule, ScheduledEvent } from "firebase-functions/v2/scheduler";

const db = admin.firestore();
const TIME_WINDOW_HOURS = 2;
const REGION = "europe-west3";

/**
 * A scheduled Cloud Function that runs every 15 minutes to take an
 * "attendance snapshot" for events that are about to start.
 */
export const recordEventAttendance = onSchedule(
    {
        schedule: "3,18,33,48 * * * *",
        timeZone: "Europe/Warsaw",
        region: REGION,
    },
    async (event: ScheduledEvent): Promise<void> => {
        logger.info("Scheduled function triggered: recordEventAttendance", {
            scheduleTime: event.scheduleTime,
            region: "europe-west3",
        });

        await processEventAttendance(db, logger);

        logger.info("recordEventAttendance completed");
        return;
    },
);

/**
 * Core business logic for recording event attendance.
 * This function is designed to be testable independently of the Cloud Function scheduler
 *
 * @param db The Firestore instance.
 * @param logger The logger instance from firebase-functions/logger
 */
export const processEventAttendance = async (
    db: admin.firestore.Firestore,
    logger: typeof import("firebase-functions/logger"),
): Promise<void> => {
    try {
        logger.info(
            "Checking for event instances to process for attendance snapshot...",
            {
                region: REGION,
            },
        );

        const now = admin.firestore.Timestamp.now();
        const twoHoursFromNow = admin.firestore.Timestamp.fromMillis(
            now.toMillis() + TIME_WINDOW_HOURS * 60 * 60 * 1000,
        );
        const eventInstancesQuery = db
            .collection("eventInstances")
            .where("eventStartDateTime", ">=", now)
            .where("eventStartDateTime", "<=", twoHoursFromNow);

        const eventsSnapshot = await eventInstancesQuery.get();

        if (eventsSnapshot.empty) {
            logger.info(
                "No upcoming event instances found in the time window",
            );
            return;
        }

        const batch = db.batch();
        let operationsCount = 0;
        let eventsToProcessCount = 0;

        logger.info(
            `Found ${eventsSnapshot.size} total event instances in the time window. Filtering now...`,
        );

        const userIdsToCheck = new Set<string>();
        const eventsToProcess: {
            doc: admin.firestore.QueryDocumentSnapshot;
            eventData: any;
        }[] = [];

        eventsSnapshot.forEach((doc) => {
            const eventData = doc.data();

            if (eventData.attendanceProcessed === true) {
                return;
            }

            if (
                !eventData.participants || !eventData.groupId ||
                !eventData.eventStartDateTime
            ) {
                logger.warn(
                    `Event instance ${doc.id} is missing required fields, marking as processed to skip`,
                );

                batch.update(doc.ref, { attendanceProcessed: true });
                operationsCount++;
                return;
            }

            eventsToProcess.push({ doc, eventData });
            const { participants, spots } = eventData;
            const confirmedParticipants = participants.slice(0, spots);

            confirmedParticipants.forEach((participant: { uid: string }) => {
                if (participant.uid) {
                    userIdsToCheck.add(participant.uid);
                }
            });
        });

        const userDocs = await Promise.all(
            Array.from(userIdsToCheck).map((uid) =>
                db.collection("users").doc(uid).get()
            ),
        );

        const userData = new Map<string, admin.firestore.DocumentData>();
        userDocs.forEach((doc) => {
            if (doc.exists) {
                userData.set(doc.id, doc.data()!);
            }
        });

        for (const { doc, eventData } of eventsToProcess) {
            eventsToProcessCount++;
            logger.info(
                `Processing event instance: "${eventData.title}" (${doc.id})`,
            );

            const { participants, groupId, eventStartDateTime, spots } =
                eventData;
            const confirmedParticipants = participants.slice(0, spots);

            if (confirmedParticipants.length === 0) {
                logger.info(
                    `Event instance ${doc.id} has no confirmed participants, skipping`,
                );

                batch.update(doc.ref, { attendanceProcessed: true });
                operationsCount++;
                continue;
            }

            confirmedParticipants.forEach(
                (participant: { uid: string; displayName: string }) => {
                    if (!participant.uid) {
                        return;
                    }

                    const userRef = db.collection("users").doc(
                        participant.uid,
                    );
                    const fieldToUpdate = `attendanceHistory.${groupId}`;

                    const currentUserData = userData.get(participant.uid);

                    let shouldWriteAttendance = true;
                    if (currentUserData?.attendanceHistory?.[groupId]) {
                        const existingAttendance =
                            currentUserData.attendanceHistory[groupId];

                        if (
                            existingAttendance.toMillis() >=
                            eventStartDateTime.toMillis()
                        ) {
                            shouldWriteAttendance = false;
                            logger.info(
                                `Skipping attendance update for user "${participant.displayName}" - existing record is newer or same (${existingAttendance.toDate()} >= ${eventStartDateTime.toDate()})`,
                            );
                        }
                    }

                    if (shouldWriteAttendance) {
                        batch.update(userRef, {
                            [fieldToUpdate]: eventStartDateTime,
                        });
                        operationsCount++;
                        logger.info(
                            `Scheduled attendance update for user "${participant.displayName}" for group ${groupId} with timestamp ${eventStartDateTime.toDate()}`,
                        );
                    }
                },
            );

            batch.update(doc.ref, { attendanceProcessed: true });
            operationsCount++;
        }

        if (operationsCount > 0) {
            await batch.commit();
            logger.info(
                `Successfully processed ${eventsToProcessCount} event instances and committed ${operationsCount} database operations`,
            );

            return;
        }

        logger.info(
            "All event instances in the time window were already processed",
        );
    } catch (error) {
        logger.error("Error during attendance snapshot processing", {
            error: (error as Error)?.message || error,
        });

        throw error;
    }
};
