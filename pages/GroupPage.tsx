import { addDoc, collection, doc, getDoc, onSnapshot, orderBy, query, serverTimestamp, Timestamp, where } from '@firebase/firestore';
import { add } from 'date-fns';
import React, { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { Link, useParams } from 'react-router-dom';

import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import Spinner from '../components/common/Spinner';
import EventCard from '../components/events/EventCard';
import { useAuth } from '../hooks/useAuth';
import { db } from '../services/firebase';
import { EventInstance, EventTemplate, Group } from '../types';

const GroupPage: React.FC = () => {
  const { groupId } = useParams<{ groupId: string }>();
  const { user, userProfile } = useAuth();
  
  const [group, setGroup] = useState<Group | null>(null);
  const [eventInstances, setEventInstances] = useState<EventInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEventModalOpen, setEventModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const isOwner = group?.ownerUids.includes(user?.uid || '') || false;

  useEffect(() => {
    if (!groupId) return;

    const fetchGroupDetails = async () => {
      const groupRef = doc(db, 'groups', groupId);
      const groupSnap = await getDoc(groupRef);
      if (groupSnap.exists()) {
        setGroup({ id: groupSnap.id, ...groupSnap.data() } as Group);
      } else {
        toast.error("Group not found.");
      }
    };
    
    fetchGroupDetails();

    const q = query(
      collection(db, 'eventInstances'), 
      where('groupId', '==', groupId),
      orderBy('eventStartDateTime', 'asc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const instances: EventInstance[] = [];
      snapshot.forEach(doc => {
        instances.push({ id: doc.id, ...doc.data() } as EventInstance);
      });
      setEventInstances(instances);
      setLoading(false);
    }, (error) => {
        console.error("Error fetching events: ", error);
        toast.error("Failed to load events.");
        setLoading(false);
    });

    return () => unsubscribe();

  }, [groupId]);
  
  const handleCreateEvent = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!groupId || !isOwner) return;

    setIsSubmitting(true);
    const formData = new FormData(e.currentTarget);
    const data = Object.fromEntries(formData.entries());

    try {
        const eventStartDateTime = new Date(`${data.eventStartDate}T${data.eventStartTime}`);
        const registrationOpenDateTime = new Date(`${data.regOpenDate}T${data.regOpenTime}`);
        const listRevealDateTime = new Date(`${data.revealDate}T${data.revealTime}`);
        const recurrenceEndDate = new Date(data.recurrenceEndDate as string);

        const template: Omit<EventTemplate, 'id' | 'createdAt'> = {
            groupId,
            title: data.title as string,
            description: data.description as string,
            location: data.location as string,
            spots: Number(data.spots),
            eventStartDateTime: Timestamp.fromDate(eventStartDateTime),
            registrationOpenDateTime: Timestamp.fromDate(registrationOpenDateTime),
            listRevealDateTime: Timestamp.fromDate(listRevealDateTime),
            recurrence: {
                type: data.recurrenceType as 'days' | 'weeks' | 'months',
                value: Number(data.recurrenceValue),
            },
            recurrenceEndDate: Timestamp.fromDate(recurrenceEndDate),
        };
        
        const eventTemplateRef = await addDoc(collection(db, 'events'), {
            ...template,
            createdAt: serverTimestamp(),
        });

        // Create instances
        let currentEventDate = eventStartDateTime;
        let currentRegDate = registrationOpenDateTime;
        let currentRevealDate = listRevealDateTime;

        while(currentEventDate <= recurrenceEndDate) {
            const instance: Omit<EventInstance, 'id'> = {
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
            };
            await addDoc(collection(db, 'eventInstances'), instance);

            const duration = { [template.recurrence.type]: template.recurrence.value };
            currentEventDate = add(currentEventDate, duration);
            currentRegDate = add(currentRegDate, duration);
            currentRevealDate = add(currentRevealDate, duration);
        }

        toast.success("Recurring event created successfully!");
        setEventModalOpen(false);
    } catch (error) {
        console.error("Error creating event:", error);
        toast.error("Failed to create event.");
    } finally {
        setIsSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center h-64"><Spinner /></div>;

  return (
    <div>
        <div className="mb-8">
            <Link to="/" className="text-primary hover:underline">&larr; Back to Groups</Link>
            <div className="flex justify-between items-center mt-4">
                <div>
                    <h1 className="text-4xl font-bold">{group?.name}</h1>
                    <p className="text-dark-text-secondary mt-1">{group?.description}</p>
                </div>
                {isOwner && (
                    <Button onClick={() => setEventModalOpen(true)}>
                        Create New Event
                    </Button>
                )}
            </div>
        </div>

        <h2 className="text-2xl font-bold mb-4">Upcoming Events</h2>
        <div className="space-y-6">
            {eventInstances.length > 0 ? (
                eventInstances.map(instance => <EventCard key={instance.id} instance={instance} userProfile={userProfile} />)
            ) : (
                <div className="text-center py-10 bg-dark-surface rounded-lg">
                    <p className="text-dark-text-secondary">No upcoming events scheduled for this group.</p>
                    {isOwner && <p className="mt-2 text-sm text-dark-text-secondary">Click "Create New Event" to get started.</p>}
                </div>
            )}
        </div>
        
        {isOwner && (
            <Modal isOpen={isEventModalOpen} onClose={() => setEventModalOpen(false)} title="Create New Recurring Event">
                <form onSubmit={handleCreateEvent} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2">
                    {/* Basic Info */}
                    <input name="title" placeholder="Event Title" required className="input-style" />
                    <textarea name="description" placeholder="Event Description" required className="input-style" rows={3}></textarea>
                    <input name="location" placeholder="Location (e.g., Google Maps Link)" required className="input-style" />
                    <input name="spots" type="number" placeholder="Available Spots" required min="1" className="input-style" />
                    
                    {/* Date Times */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="label-style">First Event Date</label>
                            <input name="eventStartDate" type="date" required className="input-style" />
                        </div>
                        <div>
                            <label className="label-style">Event Time</label>
                            <input name="eventStartTime" type="time" required className="input-style" />
                        </div>
                        <div>
                            <label className="label-style">Registration Open Date</label>
                            <input name="regOpenDate" type="date" required className="input-style" />
                        </div>
                        <div>
                            <label className="label-style">Registration Open Time</label>
                            <input name="regOpenTime" type="time" required className="input-style" />
                        </div>
                        <div>
                            <label className="label-style">List Reveal Date</label>
                            <input name="revealDate" type="date" required className="input-style" />
                        </div>
                        <div>
                            <label className="label-style">List Reveal Time</label>
                            <input name="revealTime" type="time" required className="input-style" />
                        </div>
                    </div>
                    
                    {/* Recurrence */}
                     <div>
                        <label className="label-style">Recurrence</label>
                        <div className="flex items-center gap-2">
                            <span>Every</span>
                            <input name="recurrenceValue" type="number" min="1" defaultValue="1" required className="input-style w-20" />
                            <select name="recurrenceType" required className="input-style">
                                <option value="days">Day(s)</option>
                                <option value="weeks">Week(s)</option>
                                <option value="months">Month(s)</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label className="label-style">Recurrence End Date</label>
                        <input name="recurrenceEndDate" type="date" required className="input-style" />
                    </div>

                    <div className="pt-4 flex justify-end gap-3">
                        <Button type="button" variant="ghost" onClick={() => setEventModalOpen(false)}>Cancel</Button>
                        <Button type="submit" isLoading={isSubmitting}>Create Events</Button>
                    </div>
                    <style>{`
                        .input-style { display: block; width: 100%; background-color: #2a2a2a; border: 1px solid #444; color: #e0e0e0; border-radius: 0.375rem; padding: 0.5rem 0.75rem; }
                        .label-style { display: block; font-size: 0.875rem; font-weight: 500; color: #a0a0a0; margin-bottom: 0.25rem; }
                    `}</style>
                </form>
            </Modal>
        )}
    </div>
  );
};

export default GroupPage;