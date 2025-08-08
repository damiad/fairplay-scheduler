import { collection, doc, onSnapshot, orderBy, query, where } from "@firebase/firestore";
import { useEffect, useState } from "react";
import toast from "react-hot-toast";

import { db } from "../services/firebase";
import { EventInstance, Group } from "../types";

export const useGroupData = (groupId: string | undefined) => {
  const [group, setGroup] = useState<Group | null>(null);
  const [upcomingEvents, setUpcomingEvents] = useState<EventInstance[]>([]);
  const [pastEvents, setPastEvents] = useState<EventInstance[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    const groupRef = doc(db, "groups", groupId);
    const groupUnsubscribe = onSnapshot(
      groupRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setGroup({ id: docSnap.id, ...docSnap.data() } as Group);
        } else {
          toast.error("Group not found.");
          setGroup(null);
        }
      },
      (error) => {
        console.error("Error fetching group details:", error);
        toast.error("Failed to load group details.");
      }
    );


    const q = query(
      collection(db, "eventInstances"),
      where("groupId", "==", groupId),
      orderBy("eventStartDateTime", "asc")
    );

    const eventsUnsubscribe = onSnapshot(
      q,
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

    return () => {
      groupUnsubscribe();
      eventsUnsubscribe();
    };
  }, [groupId]);

  return { group, upcomingEvents, pastEvents, loading };
};
