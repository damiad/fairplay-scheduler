import { addDoc, collection, serverTimestamp, Timestamp } from "@firebase/firestore";
import { add } from "date-fns";
import React, { useState } from "react";
import toast from "react-hot-toast";

import { db } from "../../services/firebase";
import { EventInstance, EventTemplate } from "../../types";
import Button from "../common/Button";

interface CreateEventFormProps {
  groupId: string;
  onClose: () => void;
}

const CreateEventForm: React.FC<CreateEventFormProps> = ({
  groupId,
  onClose,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRecurring, setIsRecurring] = useState(true);

  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
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

      if (isRecurring) {
        // --- Logic for RECURRING events ---
        const recurrenceEndDate = new Date(data.recurrenceEndDate as string);

        const template: Omit<EventTemplate, "id" | "createdAt"> = {
          groupId,
          title: data.title as string,
          description: data.description as string,
          location: data.location as string,
          spots: Number(data.spots),
          eventStartDateTime: Timestamp.fromDate(eventStartDateTime),
          registrationOpenDateTime: Timestamp.fromDate(
            registrationOpenDateTime
          ),
          listRevealDateTime: Timestamp.fromDate(listRevealDateTime),
          recurrence: {
            type: data.recurrenceType as "days" | "weeks" | "months",
            value: Number(data.recurrenceValue),
          },
          recurrenceEndDate: Timestamp.fromDate(recurrenceEndDate),
        };

        const eventTemplateRef = await addDoc(collection(db, "events"), {
          ...template,
          createdAt: serverTimestamp(),
        });

        let currentEventDate = eventStartDateTime;
        let currentRegDate = registrationOpenDateTime;
        let currentRevealDate = listRevealDateTime;

        while (currentEventDate <= recurrenceEndDate) {
          const instance: Omit<EventInstance, "id"> = {
            eventId: eventTemplateRef.id,
            groupId,
            title: template.title,
            description: template.description,
            location: template.location,
            spots: template.spots,
            eventStartDateTime: Timestamp.fromDate(currentEventDate),
            registrationOpenDateTime: Timestamp.fromDate(currentRegDate),
            listRevealDateTime: Timestamp.fromDate(currentRevealDate),
            participants: [],
            participantsListProcessed: false,
            attendanceProcessed: false,
          };
          await addDoc(collection(db, "eventInstances"), instance);

          const duration = {
            [template.recurrence.type]: template.recurrence.value,
          };
          currentEventDate = add(currentEventDate, duration);
          currentRegDate = add(currentRegDate, duration);
          currentRevealDate = add(currentRevealDate, duration);
        }
        toast.success("Recurring event created successfully!");
      } else {
        // --- Logic for a ONE-TIME event ---
        const instance: Omit<EventInstance, "id"> = {
          eventId: "one-time-event", // Placeholder as there's no template
          groupId,
          title: data.title as string,
          description: data.description as string,
          location: data.location as string,
          spots: Number(data.spots),
          eventStartDateTime: Timestamp.fromDate(eventStartDateTime),
          registrationOpenDateTime: Timestamp.fromDate(
            registrationOpenDateTime
          ),
          listRevealDateTime: Timestamp.fromDate(listRevealDateTime),
          participants: [],
          participantsListProcessed: false,
          attendanceProcessed: false,
        };
        await addDoc(collection(db, "eventInstances"), instance);
        toast.success("Event created successfully!");
      }

      onClose();
    } catch (error) {
      console.error("Error creating event:", error);
      toast.error("Failed to create event.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleCreateEvent}
      className="space-y-4 max-h-[70vh] overflow-y-auto pr-2"
    >
      <input
        name="title"
        placeholder="Event Title"
        required
        className="input-style"
      />
      <textarea
        name="description"
        placeholder="Event Description"
        required
        className="input-style"
        rows={3}
      ></textarea>
      <input
        name="location"
        placeholder="Location (e.g., Google Maps Link)"
        required
        className="input-style"
      />
      <input
        name="spots"
        type="number"
        placeholder="Available Spots"
        required
        min="1"
        className="input-style"
      />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label-style">Event Date</label>
          <input
            name="eventStartDate"
            type="date"
            required
            className="input-style"
          />
        </div>
        <div>
          <label className="label-style">Event Time</label>
          <input
            name="eventStartTime"
            type="time"
            required
            className="input-style"
          />
        </div>
        <div>
          <label className="label-style">Registration Open Date</label>
          <input
            name="regOpenDate"
            type="date"
            required
            className="input-style"
          />
        </div>
        <div>
          <label className="label-style">Registration Open Time</label>
          <input
            name="regOpenTime"
            type="time"
            required
            className="input-style"
          />
        </div>
        <div>
          <label className="label-style">List Reveal Date</label>
          <input
            name="revealDate"
            type="date"
            required
            className="input-style"
          />
        </div>
        <div>
          <label className="label-style">List Reveal Time</label>
          <input
            name="revealTime"
            type="time"
            required
            className="input-style"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer text-sm">
        <input
          type="checkbox"
          checked={isRecurring}
          onChange={(e) => setIsRecurring(e.target.checked)}
          className="form-checkbox bg-dark-bg border-dark-border text-primary focus:ring-primary"
        />
        <span>Make this a recurring event</span>
      </label>

      {isRecurring && (
        <div className="space-y-4 border-t border-dark-border pt-4">
          <label className="label-style">Recurrence</label>
          <div className="flex items-center gap-2">
            <span>Every</span>
            <input
              name="recurrenceValue"
              type="number"
              min="1"
              defaultValue="1"
              required={isRecurring}
              className="input-style w-20"
            />
            <select
              name="recurrenceType"
              required={isRecurring}
              className="input-style"
            >
              <option value="days">Day(s)</option>
              <option value="weeks">Week(s)</option>
              <option value="months">Month(s)</option>
            </select>
          </div>
          <div>
            <label className="label-style">Recurrence End Date</label>
            <input
              name="recurrenceEndDate"
              type="date"
              required={isRecurring}
              className="input-style"
            />
          </div>
        </div>
      )}

      <div className="pt-4 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isSubmitting}>
          Create Event{isRecurring && "s"}
        </Button>
      </div>
      <style>{`
                .input-style { display: block; width: 100%; background-color: #2a2a2a; border: 1px solid #444; color: #e0e0e0; border-radius: 0.375rem; padding: 0.5rem 0.75rem; }
                .label-style { display: block; font-size: 0.875rem; font-weight: 500; color: #a0a0a0; margin-bottom: 0.25rem; }
            `}</style>
    </form>
  );
};

export default CreateEventForm;
