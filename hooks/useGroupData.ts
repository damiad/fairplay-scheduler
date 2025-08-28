import {
  collection,
  onSnapshot,
  query,
  where,
  orderBy,
} from "@firebase/firestore";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { db } from "../services/firebase";
import { EventInstance, Group } from "../types";

// This hook now fetches group data by slug and handles loading states,
// but it no longer shows a toast for a "not found" error.
export const useGroupData = (groupSlug: string | undefined) => {
  const [group, setGroup] = useState<Group | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<EventInstance[]>([]);
  const [pastEvents, setPastEvents] = useState<EventInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupSlug) {
      setLoading(false);
      setGroup(null);
      setUpcomingEvents([]);
      setPastEvents([]);
      return;
    }

    setLoading(true);

    let eventsUnsubscribe: (() => void) | null = null;

    const groupQuery = query(
      collection(db, "groups"),
      where("slug", "==", groupSlug)
    );

    const groupUnsubscribe = onSnapshot(
      groupQuery,
      (querySnapshot) => {
        if (eventsUnsubscribe) {
          eventsUnsubscribe();
        }

        if (!querySnapshot.empty) {
          const groupDoc = querySnapshot.docs[0];
          const groupData = { id: groupDoc.id, ...groupDoc.data() } as Group;
          setGroup(groupData);

          const eventsQuery = query(
            collection(db, "eventInstances"),
            where("groupId", "==", groupData.id),
            orderBy("eventStartDateTime", "asc")
          );

          eventsUnsubscribe = onSnapshot(
            eventsQuery,
            (snapshot) => {
              const thresholdTime = new Date(
                new Date().getTime() - 2 * 60 * 60 * 1000
              );
              const upcoming: EventInstance[] = [];
              const past: EventInstance[] = [];

              snapshot.forEach((doc) => {
                const instance = { id: doc.id, ...doc.data() } as EventInstance;
                if (instance.eventStartDateTime.toDate() < thresholdTime) {
                  past.push(instance);
                } else {
                  upcoming.push(instance);
                }
              });

              setUpcomingEvents(upcoming);
              setPastEvents(
                past.sort(
                  (a, b) =>
                    b.eventStartDateTime.toDate().getTime() -
                    a.eventStartDateTime.toDate().getTime()
                )
              );
              setLoading(false);
            },
            (error) => {
              console.error("Error fetching events: ", error);
              toast.error("Failed to load events.");
              setLoading(false);
            }
          );
        } else {
          setGroup(null);
          setUpcomingEvents([]);
          setPastEvents([]);
          setLoading(false);
        }
      },
      (error) => {
        console.error("Error fetching group details:", error);
        toast.error("Failed to load group details.");
        setLoading(false);
      }
    );

    return () => {
      groupUnsubscribe();
      if (eventsUnsubscribe) {
        eventsUnsubscribe();
      }
    };
  }, [groupSlug]);

  return { group, upcomingEvents, pastEvents, loading };
};
