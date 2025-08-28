import { doc, updateDoc } from "@firebase/firestore";
import React, { useState } from "react";
import toast from "react-hot-toast";

import { useAuth } from "../../hooks/useAuth";
import { db } from "../../services/firebase";
import { Group } from "../../types";
import { validateGroupDetails } from "../../utils/utils";
import Button from "../common/Button";
import OwnersInput from "./OwnersInput";

interface EditGroupFormProps {
  group: Group;
  // Changed from onClose to pass the new slug back on success.
  onUpdateSuccess: (newSlug: string) => void;
  // Added a separate prop for just closing the modal.
  onCancel: () => void;
}

const EditGroupForm: React.FC<EditGroupFormProps> = ({
  group,
  onUpdateSuccess,
  onCancel,
}) => {
  const [groupName, setGroupName] = useState(group.name);
  const [groupDesc, setGroupDesc] = useState(group.description);
  const [ownerUids, setOwnerUids] = useState(group.ownerUids);
  const [isUpdating, setIsUpdating] = useState(false);
  const { user } = useAuth();

  const handleUpdateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    setIsUpdating(true);
    try {
      const validation = await validateGroupDetails(
        groupName,
        ownerUids,
        group.id
      );

      if (!validation.isValid) {
        toast.error(validation.error!);
        setIsUpdating(false);
        return;
      }

      const groupRef = doc(db, "groups", group.id);
      await updateDoc(groupRef, {
        name: groupName,
        slug: validation.slug,
        description: groupDesc,
        ownerUids: ownerUids,
      });

      toast.success("Group updated successfully!");
      // On success, call the callback with the new, validated slug.
      onUpdateSuccess(validation.slug!);
    } catch (error) {
      console.error("Error updating group:", error);
      toast.error("Failed to update group.");
      setIsUpdating(false);
    }
  };

  if (!user) return null;

  return (
    <form onSubmit={handleUpdateGroup}>
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
        <Button type="button" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isUpdating}>
          Save Changes
        </Button>
      </div>
      <style>{`.input-style { display: block; width: 100%; background-color: #2a2a2a; border: 1px solid #444; color: #e0e0e0; border-radius: 0.375rem; padding: 0.5rem 0.75rem; } .label-style { display: block; font-size: 0.875rem; font-weight: 500; color: #a0a0a0; margin-bottom: 0.25rem; }`}</style>
    </form>
  );
};

export default EditGroupForm;
