// functions/src/index.ts

import * as admin from "firebase-admin";
import { setGlobalOptions } from "firebase-functions/v2";

// Initialize the SDK and set global options ONCE.
admin.initializeApp();
setGlobalOptions({ maxInstances: 10, region: "europe-west3" });

// Export your functions from their respective files.
export { recordEventAttendance } from "./attendance";
export { sortParticipantScheduledFunction } from "./sorting";