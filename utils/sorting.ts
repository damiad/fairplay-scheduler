import { Timestamp } from 'firebase/firestore';

import { EventInstance, Participant, SortedParticipant, UserProfile } from '../types';

export const sortParticipants = (
    participants: Participant[],
    userProfiles: Map<string, UserProfile>,
    eventInstance: EventInstance
): SortedParticipant[] => {
    
    // const now = new Date();
    // const listRevealDate = eventInstance.listRevealDateTime.toDate();

    // const lateRegistrants = participants.filter(p => p.registeredAt.toDate() > listRevealDate);
    // const onTimeRegistrants = participants.filter(p => p.registeredAt.toDate() <= listRevealDate);

    // const sortedOnTime = onTimeRegistrants
    //     .map((p): SortedParticipant => {
    //         const userProfile = userProfiles.get(p.uid);
    //         const lastAttended = userProfile?.attendanceHistory?.[eventInstance.groupId];

    //         let priority = 3; // Regular
    //         if (p.isOrganizer) {
    //             priority = 1; // Organizer
    //         } else if (!lastAttended) {
    //             priority = 2; // Newcomer
    //         }

    //         return { ...p, priority, lastAttended };
    //     })
    //     .sort((a, b) => {
    //         // 1. Sort by priority
    //         if (a.priority !== b.priority) {
    //             return a.priority - b.priority;
    //         }

    //         // 2. For regulars, sort by last attendance date (oldest first)
    //         if (a.priority === 3 && b.priority === 3) {
    //             const aDate = a.lastAttended?.toMillis() || 0;
    //             const bDate = b.lastAttended?.toMillis() || 0;
    //             if (aDate !== bDate) {
    //                 return aDate - bDate;
    //             }
    //         }

    //         // 3. Tie-breaker: randomize
    //         // return Math.random() - 0.5;
    //         // 4. Temporarily use registration time as tie-breaker for repetitive results
    //         return a.registeredAt.toMillis() - b.registeredAt.toMillis();
    //     });

    // // Late registrants are added at the end, in the order they registered (FIFO)
    // const sortedLate = lateRegistrants
    //     .map((p): SortedParticipant => {
    //         const userProfile = userProfiles.get(p.uid);
    //         const lastAttended = userProfile?.attendanceHistory?.[eventInstance.groupId];
    //         return { ...p, priority: 4, lastAttended }; // Assign a lower priority
    //     })
    //     .sort((a,b) => a.registeredAt.toMillis() - b.registeredAt.toMillis());

    // return [...sortedOnTime, ...sortedLate];
    return participants;
};