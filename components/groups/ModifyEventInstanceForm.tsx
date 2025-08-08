import { doc, Timestamp, updateDoc } from "@firebase/firestore";
import { format } from "date-fns";
import React, { useState } from "react";
import toast from "react-hot-toast";

import { db } from "../../services/firebase";
import { EventInstance } from "../../types";
import Button from "../common/Button";

interface ModifyEventInstanceFormProps {
  instance: EventInstance;
  onClose: () => void;
}

const ModifyEventInstanceForm: React.FC<ModifyEventInstanceFormProps> = ({
  instance,
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpdateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
      const eventStartDateTime = new Date(
        `${data.eventStartDate}T${data.eventStartTime}`
      );
      const registrationOpenDateTime = new Date(
        `${data.regOpenDate}T${data.regOpenTime}`
      );
      const listRevealDateTime = new Date(
        `${data.revealDate}T${data.revealTime}`
      );

      const updatedData = {
        title: data.title as string,
        description: data.description as string,
        location: data.location as string,
        spots: Number(data.spots),
        eventStartDateTime: Timestamp.fromDate(eventStartDateTime),
        registrationOpenDateTime: Timestamp.fromDate(registrationOpenDateTime),
        listRevealDateTime: Timestamp.fromDate(listRevealDateTime),
      };

      const instanceRef = doc(db, "eventInstances", instance.id);
      await updateDoc(instanceRef, updatedData);

      toast.success("Event instance updated successfully!");
      onClose();
    } catch (error) {
      console.error("Error updating event:", error);
      toast.error("Failed to update event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleUpdateEvent}
      className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
    >
      {/* Basic Info */}
      <input
        name="title"
        placeholder="Event Title"
        required
        defaultValue={instance.title}
        className="input-style"
      />
      <textarea
        name="description"
        placeholder="Event Description"
        required
        defaultValue={instance.description}
        className="input-style"
        rows={3}
      ></textarea>
      <input
        name="location"
        placeholder="Location (e.g., Google Maps Link)"
        required
        defaultValue={instance.location}
        className="input-style"
      />
      <input
        name="spots"
        type="number"
        placeholder="Available Spots"
        required
        min="1"
        defaultValue={instance.spots}
        className="input-style"
      />

      {/* Date Times */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-style">Event Date</label>
          <input
            name="eventStartDate"
            type="date"
            required
            defaultValue={format(
              instance.eventStartDateTime.toDate(),
              "yyyy-MM-dd"
            )}
            className="input-style"
          />
        </div>
        <div>
          <label className="label-style">Event Time</label>
          <input
            name="eventStartTime"
            type="time"
            required
            defaultValue={format(instance.eventStartDateTime.toDate(), "HH:mm")}
            className="input-style"
          />
        </div>
        <div>
          <label className="label-style">Registration Open Date</label>
          <input
            name="regOpenDate"
            type="date"
            required
            defaultValue={format(
              instance.registrationOpenDateTime.toDate(),
              "yyyy-MM-dd"
            )}
            className="input-style"
          />
        </div>
        <div>
          <label className="label-style">Registration Open Time</label>
          <input
            name="regOpenTime"
            type="time"
            required
            defaultValue={format(
              instance.registrationOpenDateTime.toDate(),
              "HH:mm"
            )}
            className="input-style"
          />
        </div>
        <div>
          <label className="label-style">List Reveal Date</label>
          <input
            name="revealDate"
            type="date"
            required
            defaultValue={format(
              instance.listRevealDateTime.toDate(),
              "yyyy-MM-dd"
            )}
            className="input-style"
          />
        </div>
        <div>
          <label className="label-style">List Reveal Time</label>
          <input
            name="revealTime"
            type="time"
            required
            defaultValue={format(instance.listRevealDateTime.toDate(), "HH:mm")}
            className="input-style"
          />
        </div>
      </div>

      <div className="pt-4 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Update Event
        </Button>
      </div>
      <style>{`
                .input-style { display: block; width: 100%; background-color: #2a2a2a; border: 1px solid #444; color: #e0e0e0; border-radius: 0.375rem; padding: 0.5rem 0.75rem; }
                .label-style { display: block; font-size: 0.875rem; font-weight: 500; color: #a0a0a0; margin-bottom: 0.25rem; }
            `}</style>
    </form>
  );
};

export default ModifyEventInstanceForm;
