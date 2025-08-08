import { deleteDoc, doc } from "@firebase/firestore";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

import Modal from "../components/common/Modal";
import Spinner from "../components/common/Spinner";
import CreateEventForm from "../components/groups/CreateEventForm";
import EventTabs from "../components/groups/EventTabs";
import GroupHeader from "../components/groups/GroupHeader";
import ModifyEventInstanceForm from "../components/groups/ModifyEventInstanceForm";
import { useAuth } from "../hooks/useAuth";
import { useGroupData } from "../hooks/useGroupData";
import { db } from "../services/firebase";
import { EventInstance } from "../types";

const GroupPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, userProfile } = useAuth();
  const { group, upcomingEvents, pastEvents, loading } = useGroupData(groupId);

  const [isCreateModalOpen, setCreateModalOpen] = useState(false);
  const [isEditModalOpen, setEditModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] =
    useState<EventInstance | null>(null);

  const isOwner = group?.ownerUids.includes(user?.uid || "") || false;

  const handleEditClick = (instance: EventInstance) => {
    setSelectedInstance(instance);
    setEditModalOpen(true);
  };

  const handleDelete = async (instanceId: string) => {
    if (
      window.confirm(
        "Are you sure you want to delete this event instance? This action cannot be undone."
      )
    ) {
      try {
        await deleteDoc(doc(db, "eventInstances", instanceId));
        toast.success("Event instance deleted successfully.");
      } catch (error) {
        console.error("Error deleting event instance: ", error);
        toast.error("Failed to delete event instance.");
      }
    }
  };

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
        onOpenCreateEventModal={() => setCreateModalOpen(true)}
      />

      <EventTabs
        upcomingEvents={upcomingEvents}
        pastEvents={pastEvents}
        userProfile={userProfile}
        isOwner={isOwner}
        onEdit={handleEditClick}
        onDelete={handleDelete}
      />

      {isOwner && (
        <Modal
          isOpen={isCreateModalOpen}
          onClose={() => setCreateModalOpen(false)}
          closeOnOverlayClick={false}
          title="Create New Recurring Event"
        >
          <CreateEventForm
            groupId={groupId!}
            onClose={() => setCreateModalOpen(false)}
          />
        </Modal>
      )}

      {isOwner && selectedInstance && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setEditModalOpen(false)}
          closeOnOverlayClick={false}
          title="Edit Event Instance"
        >
          <ModifyEventInstanceForm
            instance={selectedInstance}
            onClose={() => setEditModalOpen(false)}
          />
        </Modal>
      )}
    </div>
  );
};

export default GroupPage;
