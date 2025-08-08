import { deleteDoc, doc } from "@firebase/firestore";
import React, { useState } from "react";
import toast from "react-hot-toast";
import { useParams } from "react-router-dom";

import Modal from "../components/common/Modal";
import Spinner from "../components/common/Spinner";
import CreateEventForm from "../components/groups/CreateEventForm";
import EditGroupForm from "../components/groups/EditGroupForm";
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

  const [isCreateEventModalOpen, setCreateEventModalOpen] = useState(false);
  const [isEditEventModalOpen, setEditEventModalOpen] = useState(false);
  const [isEditGroupModalOpen, setEditGroupModalOpen] = useState(false);
  const [selectedInstance, setSelectedInstance] =
    useState<EventInstance | null>(null);

  const isOwner = group?.ownerUids.includes(user?.uid || "") || false;

  const handleEditEventClick = (instance: EventInstance) => {
    setSelectedInstance(instance);
    setEditEventModalOpen(true);
  };

  const handleDeleteEvent = async (instanceId: string) => {
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
        onOpenCreateEventModal={() => setCreateEventModalOpen(true)}
        onOpenEditGroupModal={() => setEditGroupModalOpen(true)}
      />

      <EventTabs
        upcomingEvents={upcomingEvents}
        pastEvents={pastEvents}
        userProfile={userProfile}
        isOwner={isOwner}
        onEdit={handleEditEventClick}
        onDelete={handleDeleteEvent}
      />

      {isOwner && (
        <>
          <Modal
            isOpen={isCreateEventModalOpen}
            onClose={() => setCreateEventModalOpen(false)}
            closeOnOverlayClick={false}
            title="Create New Event"
          >
            <CreateEventForm
              groupId={groupId!}
              onClose={() => setCreateEventModalOpen(false)}
            />
          </Modal>

          {selectedInstance && (
            <Modal
              isOpen={isEditEventModalOpen}
              onClose={() => setEditEventModalOpen(false)}
              closeOnOverlayClick={false}
              title="Edit Event Instance"
            >
              <ModifyEventInstanceForm
                instance={selectedInstance}
                onClose={() => setEditEventModalOpen(false)}
              />
            </Modal>
          )}

          {group && (
            <Modal
              isOpen={isEditGroupModalOpen}
              onClose={() => setEditGroupModalOpen(false)}
              closeOnOverlayClick={false}
              title="Edit Group Details"
            >
              <EditGroupForm
                group={group}
                onClose={() => setEditGroupModalOpen(false)}
              />
            </Modal>
          )}
        </>
      )}
    </div>
  );
};

export default GroupPage;
