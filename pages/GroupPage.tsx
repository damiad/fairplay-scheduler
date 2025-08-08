import CreateEventForm from "../components/groups/CreateEventForm";
import EventTabs from "../components/groups/EventTabs";
import GroupHeader from "../components/groups/GroupHeader";
import { useGroupData } from "../hooks/useGroupData";
import React, { useState } from "react";
import { useParams } from "react-router-dom";

import Modal from "../components/common/Modal";
import Spinner from "../components/common/Spinner";
import { useAuth } from "../hooks/useAuth";

const GroupPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, userProfile } = useAuth();
  const { group, upcomingEvents, pastEvents, loading } = useGroupData(groupId);
  const [isEventModalOpen, setEventModalOpen] = useState(false);

  const isOwner = group?.ownerUids.includes(user?.uid || "") || false;

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner />
      </div>
    );
  }

  return (
    <div>
      <GroupHeader
        group={group}
        isOwner={isOwner}
        onOpenCreateEventModal={() => setEventModalOpen(true)}
      />

      <EventTabs
        upcomingEvents={upcomingEvents}
        pastEvents={pastEvents}
        userProfile={userProfile}
        isOwner={isOwner}
      />

      {isOwner && (
        <Modal
          isOpen={isEventModalOpen}
          onClose={() => setEventModalOpen(false)}
          closeOnOverlayClick={false}
          title="Create New Event"
        >
          <CreateEventForm
            groupId={groupId!}
            onClose={() => setEventModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default GroupPage;
