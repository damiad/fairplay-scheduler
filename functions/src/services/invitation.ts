import * as admin from "firebase-admin";
import { DocumentReference } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";

import { sendGmailInvite } from "./gmail";

const ORGANIZER_EMAIL = "damiad@google.com";

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
}

export async function sendEmailInvites(
  db: admin.firestore.Firestore,
  instanceRef: DocumentReference,
  instance: EventInstance,
  sortedParticipants: Participant[]
): Promise<void> {
  const confirmedList = sortedParticipants.slice(0, instance.spots);

  if (confirmedList.length === 0) {
    logger.info(`No confirmed participants for event ${instanceRef.id}.`);
    return;
  }

  const confirmedUserDocs = await Promise.all(
    confirmedList.map((p) => db.collection("users").doc(p.uid).get())
  );

  const attendees = confirmedUserDocs
    .map((doc) => ({ email: doc.data()?.email as string }))
    .filter((attendee) => attendee.email);

  if (attendees.length > 0) {
    const resignationLink = `https://damiad.github.io/fairplay-scheduler/#/group/${instance.groupId}`;
    const startTime = instance.eventStartDateTime.toDate();
    const endTime = instance.eventEndDateTime
      ? instance.eventEndDateTime.toDate()
      : new Date(startTime.getTime() + 60 * 60 * 1000);

    const emailBody = `
      <h1>You're Invited!</h1>
      <p>Please accept the attached calendar invite for: <strong>${instance.title}</strong>.</p>
      <p>If you can't make it, please use the link below to resign.</p>
      <p><a href="${resignationLink}">Resign from this event</a></p>
    `;

    try {
      await sendGmailInvite({
        organizerEmail: ORGANIZER_EMAIL,
        to: attendees.map((a) => a.email),
        subject: `Invite: ${instance.title}`,
        htmlBody: emailBody,
        event: {
          title: instance.title,
          description: `To resign if you can't make it, please visit: ${resignationLink}\n\n---\n\n${instance.description}`,
          location: instance.location,
          startTime: startTime,
          endTime: endTime,
          attendees: attendees,
        },
      });
      await instanceRef.update({ calendarInvitesSent: true });
    } catch (error) {
      logger.error(
        `Failed to send Gmail invites for event ${instanceRef.id}.`,
        error
      );
    }
  } else {
    logger.info(
      `No valid emails for confirmed participants of event ${instanceRef.id}.`
    );
  }
}
