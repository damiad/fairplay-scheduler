import { addDoc, collection, serverTimestamp } from "@firebase/firestore";
import React, { useState } from "react";
import toast from "react-hot-toast";

import { useAuth } from "../../hooks/useAuth";
import { db } from "../../services/firebase";
import Button from "../common/Button";

interface CreateGroupFormProps {
  onClose: () => void;
}

const CreateGroupForm: React.FC<CreateGroupFormProps> = ({ onClose }) => {
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !user) return;

    setIsCreating(true);
    try {
      await addDoc(collection(db, "groups"), {
        name: groupName,
        description: groupDesc,
        ownerUids: [user.uid],
        createdAt: serverTimestamp(),
      });
      toast.success("Group created successfully!");
      onClose();
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <form onSubmit={handleCreateGroup}>
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
            placeholder="e.g., Football-WAW"
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
            placeholder="A short description of the group and its activities."
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
        <Button type="submit" isLoading={isCreating}>
          Create Group
        </Button>
      </div>
    </form>
  );
};

export default CreateGroupForm;
