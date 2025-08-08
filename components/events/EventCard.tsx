import { arrayRemove, arrayUnion, doc, Timestamp, updateDoc } from "@firebase/firestore";
import { format } from "date-fns";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { useAuth } from "../../hooks/useAuth";
import { db } from "../../services/firebase";
import { EventInstance, Participant, UserProfile } from "../../types";
import Button from "../common/Button";

interface EventCardProps {
  instance: EventInstance;
  userProfile: UserProfile | null;
  isOwner: boolean;
  isPastEvent: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const InfoIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="inline-block text-dark-text-secondary"
  >
    <circle cx="12" cy="12" r="10"></circle>
    <line x1="12" y1="16" x2="12" y2="12"></line>
    <line x1="12" y1="8" x2="12.01" y2="8"></line>
  </svg>
);

const UserIcon: React.FC = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="inline-block"
  >
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
    <circle cx="12" cy="7" r="4"></circle>
  </svg>
);

const EventCard: React.FC<EventCardProps> = ({
  instance,
  userProfile,
  isOwner,
  isPastEvent,
  onEdit,
  onDelete,
}) => {
  const { user } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);
  const [sortedList, setSortedList] = useState<Participant[]>([]);
  const [showOrganizerCheckbox, setShowOrganizerCheckbox] = useState(false);

  const currentUserParticipant = useMemo(
    () => instance.participants.find((p) => p.uid === user?.uid),
    [instance.participants, user]
  );

  const isRegistrationOpen = useMemo(() => {
    const now = new Date();
    return (
      instance.registrationOpenDateTime.toDate() <= now &&
      instance.eventStartDateTime.toDate() > now
    );
  }, [instance.registrationOpenDateTime, instance.eventStartDateTime]);

  const isListRevealed = useMemo(
    () => instance.participantsListProcessed === true,
    [instance.participantsListProcessed]
  );

  const confirmedList = useMemo(
    () => sortedList.slice(0, instance.spots),
    [sortedList, instance.spots]
  );
  const waitingList = useMemo(
    () => sortedList.slice(instance.spots),
    [sortedList, instance.spots]
  );

  useEffect(() => {
    const sortAndSetList = async () => {
      if (instance.participants.length === 0) {
        setSortedList([]);
        return;
      }
      // Sorting logic can be added here if needed in the future
      setSortedList(instance.participants);
    };

    sortAndSetList();
  }, [instance, userProfile]);

  const handleRegister = async () => {
    if (!user || !userProfile) return;
    setIsRegistering(true);
    const isOrganizer = document.getElementById("organizer-checkbox")
      ? (document.getElementById("organizer-checkbox") as HTMLInputElement)
          .checked
      : false;

    const newParticipant: Participant = {
      uid: user.uid,
      displayName: user.displayName || "Googler",
      photoURL: user.photoURL || "",
      isOrganizer,
      registeredAt: Timestamp.now(),
    };

    try {
      const instanceRef = doc(db, "eventInstances", instance.id);
      await updateDoc(instanceRef, {
        participants: arrayUnion(newParticipant),
      });
      toast.success("You're on the list!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to register.");
    } finally {
      setIsRegistering(false);
      setShowOrganizerCheckbox(false);
    }
  };

  const handleResign = async () => {
    if (!user || !currentUserParticipant) return;
    setIsRegistering(true);
    try {
      const instanceRef = doc(db, "eventInstances", instance.id);
      await updateDoc(instanceRef, {
        participants: arrayRemove(currentUserParticipant),
      });
      toast.success("You have resigned from the event.");
    } catch (error) {
      console.error(error);
      toast.error("Failed to resign.");
    } finally {
      setIsRegistering(false);
    }
  };

  const renderParticipant = (p: Participant, index: number) => (
    <li key={p.uid} className="flex items-center gap-3 py-2">
      <span className="font-mono text-dark-text-secondary w-6 text-right">
        {index + 1}.
      </span>
      <img
        src={p.photoURL}
        alt={p.displayName}
        className="w-8 h-8 rounded-full"
      />
      <span className="flex-grow">{p.displayName}</span>
      {p.isOrganizer && (
        <span className="text-xs font-bold text-danger bg-danger/20 px-2 py-1 rounded-full">
          ORGANIZER
        </span>
      )}
    </li>
  );

  return (
    <div className="bg-dark-surface rounded-lg shadow-lg p-6 flex flex-col md:flex-row gap-6 relative">
      {/* Left side - Event Details */}
      <div className="md:w-1/3 border-b md:border-b-0 md:border-r border-dark-border pb-6 md:pb-0 md:pr-6">
        <h3 className="text-2xl font-bold text-white mb-2">{instance.title}</h3>
        <p className="text-lg font-semibold text-primary">
          {format(instance.eventStartDateTime.toDate(), "eeee, MMMM d, yyyy")}
        </p>
        <p className="text-md text-dark-text-secondary mb-4">
          {format(instance.eventStartDateTime.toDate(), "p")}
        </p>
        <p className="text-sm text-dark-text-secondary mb-4">
          {instance.description}
        </p>
        {instance.location && (
          <a
            href={instance.location}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline text-sm"
          >
            View Location
          </a>
        )}
        <div className="mt-4 text-sm text-dark-text-secondary space-y-2">
          <p>
            <InfoIcon /> Registration opened:{" "}
            {format(instance.registrationOpenDateTime.toDate(), "PP p")}
          </p>
          <p>
            <InfoIcon /> List reveals:{" "}
            {format(instance.listRevealDateTime.toDate(), "PP p")}
          </p>
        </div>
      </div>

      {/* Right side - Participants */}
      <div className="md:w-2/3">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2 text-xl font-bold">
            <UserIcon /> Participants
            <span className="text-dark-text-secondary text-lg">
              ({instance.participants.length} / {instance.spots})
            </span>
          </div>
          {isRegistrationOpen &&
            (currentUserParticipant ? (
              <Button
                variant="danger"
                onClick={handleResign}
                isLoading={isRegistering}
              >
                Resign
              </Button>
            ) : (
              <div className="flex gap-2 items-center">
                {showOrganizerCheckbox && (
                  <label className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      id="organizer-checkbox"
                      type="checkbox"
                      className="form-checkbox bg-dark-bg border-dark-border text-primary focus:ring-primary"
                    />
                    <span>Organizer?</span>
                  </label>
                )}
                <Button
                  variant="secondary"
                  onClick={() =>
                    showOrganizerCheckbox
                      ? handleRegister()
                      : setShowOrganizerCheckbox(true)
                  }
                  isLoading={isRegistering}
                >
                  {showOrganizerCheckbox ? "Confirm Registration" : "Register"}
                </Button>
              </div>
            ))}
        </div>

        {isListRevealed ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <h4 className="font-bold text-secondary mb-2">
                ✅ Confirmed List ({confirmedList.length}/{instance.spots})
              </h4>
              <ul className="divide-y divide-dark-border">
                {confirmedList.map(renderParticipant)}
              </ul>
            </div>
            <div>
              <h4 className="font-bold text-warning mb-2">
                ⏳ Waiting List ({waitingList.length})
              </h4>
              {waitingList.length > 0 ? (
                <ul className="divide-y divide-dark-border">
                  {waitingList.map((p, i) =>
                    renderParticipant(p, i + instance.spots)
                  )}
                </ul>
              ) : (
                <p className="text-sm text-dark-text-secondary italic">
                  Waiting list is empty.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p className="text-center text-dark-text-secondary bg-dark-bg p-4 rounded-md">
              The participant list will be sorted and revealed on <br />
              <span className="font-semibold text-dark-text">
                {format(
                  instance.listRevealDateTime.toDate(),
                  "MMMM d, yyyy 'at' p"
                )}
              </span>
            </p>
            <h4 className="font-bold text-white mt-4 mb-2">
              Registered ({instance.participants.length})
            </h4>
            <ul className="divide-y divide-dark-border max-h-48 overflow-y-auto">
              {instance.participants.map((p, i) => (
                <li key={p.uid} className="flex items-center gap-3 py-2">
                  <img
                    src={p.photoURL}
                    alt={p.displayName}
                    className="w-8 h-8 rounded-full"
                  />
                  <span>{p.displayName}</span>
                  {p.isOrganizer && (
                    <span className="text-xs font-bold text-danger bg-danger/20 px-2 py-1 rounded-full">
                      ORGANIZER
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {isOwner && (
        <div className="absolute bottom-4 right-4 flex gap-2">
          {!isPastEvent && (
            <Button variant="ghost" onClick={onEdit}>
              Edit
            </Button>
          )}
          <Button variant="danger" onClick={onDelete}>
            Delete
          </Button>
        </div>
      )}
    </div>
  );
};

export default EventCard;
