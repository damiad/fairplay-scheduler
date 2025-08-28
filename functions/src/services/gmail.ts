import * as logger from "firebase-functions/logger";
import { google } from "googleapis";
import { v4 as uuidv4 } from "uuid";

// The require for the service-account.json file is no longer needed.

interface GmailInviteDetails {
  organizerEmail: string;
  to: string[];
  subject: string;
  htmlBody: string;
  event: {
    title: string;
    description: string;
    location: string;
    startTime: Date;
    endTime: Date;
    attendees: { email: string }[];
  };
}

/**
 * Creates an authenticated Google Calendar API client.
 */
function getGmailClient(emailToImpersonate: string) {
  // When running in a Google Cloud environment, the JWT client can use the
  // function's assigned service account identity to sign tokens automatically.
  // We only need to provide the scopes and the user to impersonate ('subject').
  const jwtClient = new google.auth.JWT({
    // email and key are omitted; they will be inferred from the environment.
    scopes: ["https://www.googleapis.com/auth/gmail.send"],
    subject: emailToImpersonate,
  });
  return google.gmail({ version: "v1", auth: jwtClient });
}

/**
 * Constructs and sends an email with a Google Calendar invite.
 */
export async function sendGmailInvite(details: GmailInviteDetails) {
  const gmail = getGmailClient(details.organizerEmail);
  const boundary = `----=${uuidv4()}`;

  // Construct the .ics calendar event data
  const icsData = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Fairplay Scheduler//EN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${uuidv4()}`,
    `ORGANIZER;CN=Fairplay Scheduler:mailto:${details.organizerEmail}`,
    ...details.event.attendees.map(
      (a) =>
        `ATTENDEE;ROLE=REQ-PARTICIPANT;PARTSTAT=NEEDS-ACTION;RSVP=TRUE:mailto:${a.email}`
    ),
    `DTSTAMP:${details.event.startTime.toISOString().replace(/[-:.]/g, "")}`,
    `DTSTART:${details.event.startTime.toISOString().replace(/[-:.]/g, "")}`,
    `DTEND:${details.event.endTime.toISOString().replace(/[-:.]/g, "")}`,
    `SUMMARY:${details.event.title}`,
    `DESCRIPTION:${details.event.description.replace(/\n/g, "\\n")}`,
    `LOCATION:${details.event.location}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  // Construct the raw email message (MIME format)
  const rawEmail = [
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    `To: ${details.to.join(", ")}`,
    `From: "Fairplay Scheduler" <${details.organizerEmail}>`,
    `Subject: ${details.subject}`,
    "",
    `--${boundary}`,
    "Content-Type: text/html; charset=UTF-8",
    "",
    details.htmlBody,
    "",
    `--${boundary}`,
    'Content-Type: text/calendar; method=REQUEST; name="invite.ics"',
    'Content-Disposition: attachment; filename="invite.ics"',
    "",
    icsData,
    "",
    `--${boundary}--`,
  ].join("\r\n");

  try {
    // Send the email using the Gmail API
    await gmail.users.messages.send({
      userId: "me", // 'me' refers to the impersonated user
      requestBody: {
        raw: Buffer.from(rawEmail).toString("base64url"),
      },
    });
    logger.info(
      `Successfully sent calendar invites to: ${details.to.join(", ")}`
    );
  } catch (error) {
    logger.error("Failed to send Gmail invite:", error);
    throw new Error("Could not send email via Gmail API.");
  }
}
