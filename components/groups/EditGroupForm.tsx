import { doc, updateDoc } from "@firebase/firestore";
import React, { useState } from "react";
import toast from "react-hot-toast";

import { db } from "../../services/firebase";
import { Group } from "../../types";
import Button from "../common/Button";

interface EditGroupFormProps {
  group: Group;
  onClose: () => void;
}

const EditGroupForm: React.FC<EditGroupFormProps> = ({ group, onClose }) => {
  const [groupName, setGroupName] = useState(group.name);
  const [groupDesc, setGroupDesc] = useState(group.description);
  const [isUpdating, setIsUpdating] = useState(false);

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsUpdating(true);
    const groupRef = doc(db, "groups", group.id);

    try {
      await updateDoc(groupRef, {
        name: groupName,
        description: groupDesc,
      });
      toast.success("Group updated successfully!");
      onClose();
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Failed to update group.");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <form onSubmit={handleUpdateGroup}>
      <div className="space-y-4">
        <div>
          <label
            htmlFor="groupName"
            className="block text-sm font-medium text-dark-text-secondary mb-1"
          >
            Group Name
          </label>
          <input
            id="groupName"
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
            required
          />
        </div>
        <div>
          <label
            htmlFor="groupDesc"
            className="block text-sm font-medium text-dark-text-secondary mb-1"
          >
            Description
          </label>
          <textarea
            id="groupDesc"
            value={groupDesc}
            onChange={(e) => setGroupDesc(e.target.value)}
            className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
            rows={3}
            required
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isUpdating}>
          Save Changes
        </Button>
      </div>
    </form>
  );
};

export default EditGroupForm;
