import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, addDoc, serverTimestamp } from '@firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import { Group } from '../types';
import Spinner from '../components/common/Spinner';
import Button from '../components/common/Button';
import Modal from '../components/common/Modal';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const DashboardPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDesc, setNewGroupDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'groups'));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const groupsData: Group[] = [];
      querySnapshot.forEach((doc) => {
        groupsData.push({ id: doc.id, ...doc.data() } as Group);
      });
      setGroups(groupsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching groups:", error);
      toast.error("Failed to load groups.");
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);
  
  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName.trim() || !user) return;

    setIsCreating(true);
    try {
      await addDoc(collection(db, 'groups'), {
        name: newGroupName,
        description: newGroupDesc,
        ownerUids: [user.uid],
        createdAt: serverTimestamp(),
      });
      toast.success('Group created successfully!');
      setIsModalOpen(false);
      setNewGroupName('');
      setNewGroupDesc('');
    } catch (error) {
      console.error("Error creating group:", error);
      toast.error("Failed to create group.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Groups</h1>
        <Button onClick={() => setIsModalOpen(true)}>
          Create New Group
        </Button>
      </div>

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.length > 0 ? groups.map(group => (
            <div key={group.id} className="bg-dark-surface p-6 rounded-lg shadow-lg hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer" onClick={() => navigate(`/group/${group.id}`)}>
              <h2 className="text-xl font-bold text-primary mb-2">{group.name}</h2>
              <p className="text-dark-text-secondary line-clamp-2">{group.description}</p>
            </div>
          )) : (
            <p className="text-dark-text-secondary col-span-full text-center">No groups found. Create one to get started!</p>
          )}
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create a New Group">
         <form onSubmit={handleCreateGroup}>
           <div className="space-y-4">
             <div>
                <label htmlFor="groupName" className="block text-sm font-medium text-dark-text-secondary mb-1">Group Name</label>
                <input
                  id="groupName"
                  type="text"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  placeholder="e.g., Football-WAW"
                  className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
                  required
                />
             </div>
             <div>
                <label htmlFor="groupDesc" className="block text-sm font-medium text-dark-text-secondary mb-1">Description</label>
                <textarea
                  id="groupDesc"
                  value={newGroupDesc}
                  onChange={(e) => setNewGroupDesc(e.target.value)}
                  placeholder="A short description of the group and its activities."
                  className="w-full bg-dark-bg border border-dark-border rounded-md px-3 py-2 focus:ring-primary focus:border-primary"
                  rows={3}
                  required
                />
             </div>
           </div>
           <div className="mt-6 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)}>Cancel</Button>
              <Button type="submit" isLoading={isCreating}>Create Group</Button>
           </div>
         </form>
      </Modal>
    </div>
  );
};

export default DashboardPage;