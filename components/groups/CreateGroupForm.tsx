import { addDoc, collection, serverTimestamp } from "@firebase/firestore";
import React, { useState } from "react";
import toast from "react-hot-toast";

import { useAuth } from "../../hooks/useAuth";
import { db } from "../../services/firebase";
import { validateGroupDetails } from "../../utils/utils";
import Button from "../common/Button";
import OwnersInput from "./OwnersInput";

interface CreateGroupFormProps {
  onClose: () => void;
}

const CreateGroupForm: React.FC<CreateGroupFormProps> = ({ onClose }) => {
  const [groupName, setGroupName] = useState("");
  const [groupDesc, setGroupDesc] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { user } = useAuth();

  const [ownerUids, setOwnerUids] = useState<string[]>(user ? [user.uid] : []);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim() || !user) return;

    setIsCreating(true);
    try {
      const validation = await validateGroupDetails(groupName, ownerUids);

      if (!validation.isValid) {
        toast.error(validation.error!);
        setIsCreating(false);
        return;
      }

      await addDoc(collection(db, "groups"), {
        name: groupName,
        slug: validation.slug,
        description: groupDesc,
        ownerUids: ownerUids,
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

  if (!user) return null;

  return (
    <form onSubmit={handleCreateGroup}>
      <div className="space-y-4">
        <div>
          <label htmlFor="groupName" className="label-style">
            Group Name
          </label>
          <input
            id="groupName"
            type="text"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="e.g., Football-WAW"
            className="input-style"
            required
          />
        </div>
        <div>
          <label htmlFor="groupDesc" className="label-style">
            Description
          </label>
          <textarea
            id="groupDesc"
            value={groupDesc}
            onChange={(e) => setGroupDesc(e.target.value)}
            placeholder="A short description of the group and its activities."
            className="input-style"
            rows={3}
          />
        </div>
        <OwnersInput
          initialOwnerUids={ownerUids}
          onOwnersChange={setOwnerUids}
        />
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isCreating}>
          Create Group
        </Button>
      </div>
      <style>{`.input-style { display: block; width: 100%; background-color: #2a2a2a; border: 1px solid #444; color: #e0e0e0; border-radius: 0.375rem; padding: 0.5rem 0.75rem; } .label-style { display: block; font-size: 0.875rem; font-weight: 500; color: #a0a0a0; margin-bottom: 0.25rem; }`}</style>
    </form>
  );
};

export default CreateGroupForm;
