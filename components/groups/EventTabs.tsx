import React, { useState } from "react";

import { EventInstance, UserProfile } from "../../types";
import EventCard from "../events/EventCard";

interface EventTabsProps {
  upcomingEvents: EventInstance[];
  pastEvents: EventInstance[];
  userProfile: UserProfile | null;
  isOwner: boolean;
}

const EventTabs: React.FC<EventTabsProps> = ({
  upcomingEvents,
  pastEvents,
  userProfile,
  isOwner,
}) => {
  const [activeView, setActiveView] = useState<"upcoming" | "past">("upcoming");

  const renderEventList = (
    events: EventInstance[],
    type: "upcoming" | "past"
  ) => {
    if (events.length > 0) {
      return events.map((instance) => (
        <EventCard
          key={instance.id}
          instance={instance}
          userProfile={userProfile}
        />
      ));
    }

    return (
      <div className="text-center py-10 bg-dark-surface rounded-lg">
        <p className="text-dark-text-secondary">
          {type === "upcoming"
            ? "No upcoming events scheduled for this group."
            : "No past events found for this group."}
        </p>
        {type === "upcoming" && isOwner && (
          <p className="mt-2 text-sm text-dark-text-secondary">
            Click "Create New Event" to get started.
          </p>
        )}
      </div>
    );
  };

  return (
    <div className="mt-8">
      <div className="flex border-b border-dark-border mb-6">
        <button
          onClick={() => setActiveView("upcoming")}
          className={`px-6 py-2 text-lg font-medium transition-colors duration-200 ${
            activeView === "upcoming"
              ? "border-b-2 border-primary text-white"
              : "text-dark-text-secondary hover:text-white"
          }`}
        >
          Upcoming ({upcomingEvents.length})
        </button>
        <button
          onClick={() => setActiveView("past")}
          className={`px-6 py-2 text-lg font-medium transition-colors duration-200 ${
            activeView === "past"
              ? "border-b-2 border-primary text-white"
              : "text-dark-text-secondary hover:text-white"
          }`}
        >
          Past ({pastEvents.length})
        </button>
      </div>

      <div className="space-y-6">
        {activeView === "upcoming"
          ? renderEventList(upcomingEvents, "upcoming")
          : renderEventList(pastEvents, "past")}
      </div>
    </div>
  );
};

export default EventTabs;
