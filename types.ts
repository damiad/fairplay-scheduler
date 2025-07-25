
import { Timestamp } from 'firebase/firestore';

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
  attendanceHistory: { [groupId: string]: Timestamp };
}

export interface Group {
  id: string;
  name: string;
  description: string;
  ownerUids: string[];
  createdAt: Timestamp;
}

export interface EventTemplate {
  id: string;
  groupId: string;
  title: string;
  description: string;
  location: string;
  spots: number;
  eventStartDateTime: Timestamp;
  registrationOpenDateTime: Timestamp;
  listRevealDateTime: Timestamp;
  recurrence: {
    type: 'days' | 'weeks' | 'months';
    value: number;
  };
  recurrenceEndDate: Timestamp;
  createdAt: Timestamp;
}

export interface Participant {
  uid: string;
  displayName: string;
  photoURL: string;
  isOrganizer: boolean;
  registeredAt: Timestamp;
}

export interface EventInstance {
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
}

export interface SortedParticipant extends Participant {
  // priority: number; // 1: Organizer, 2: Newcomer, 3: Regular
  // lastAttended?: Timestamp;
}