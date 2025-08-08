import React from "react";
import { Link } from "react-router-dom";

import { Group } from "../../types";
import Button from "../common/Button";

interface GroupHeaderProps {
  group: Group | null;
  isOwner: boolean;
  onOpenCreateEventModal: () => void;
}

const GroupHeader: React.FC<GroupHeaderProps> = ({
  group,
  isOwner,
  onOpenCreateEventModal,
}) => {
  return (
    <div className="mb-8">
      <Link to="/" className="text-primary hover:underline">
        &larr; Back to Groups
      </Link>
      <div className="flex justify-between items-center mt-4">
        <div>
          <h1 className="text-4xl font-bold">{group?.name}</h1>
          <p className="text-dark-text-secondary mt-1">{group?.description}</p>
        </div>
        {isOwner && (
          <Button onClick={onOpenCreateEventModal}>Create New Event</Button>
        )}
      </div>
    </div>
  );
};

export default GroupHeader;
