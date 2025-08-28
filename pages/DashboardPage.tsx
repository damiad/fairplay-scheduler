import { collection, onSnapshot, query } from "@firebase/firestore";
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import Button from "../components/common/Button";
import Modal from "../components/common/Modal";
import Spinner from "../components/common/Spinner";
import CreateGroupForm from "../components/groups/CreateGroupForm";
import { db } from "../services/firebase";
import { Group } from "../types";

const DashboardPage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, "groups"));
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const groupsData: Group[] = [];
      querySnapshot.forEach((doc) => {
        groupsData.push({ id: doc.id, ...doc.data() } as Group);
      });
      setGroups(groupsData);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Groups</h1>
        <Button onClick={() => setIsModalOpen(true)}>Create New Group</Button>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {groups.length > 0 ? (
            groups.map((group) => (
              <div
                key={group.slug}
                className="bg-dark-surface p-6 rounded-lg shadow-lg hover:shadow-primary/20 hover:-translate-y-1 transition-all duration-300 cursor-pointer"
                onClick={() => navigate(`/group/${group.slug}`)}
              >
                <h2 className="text-xl font-bold text-primary mb-2">
                  {group.name}
                </h2>
                <p className="text-dark-text-secondary line-clamp-2">
                  {group.description}
                </p>
              </div>
            ))
          ) : (
            <p className="text-dark-text-secondary col-span-full text-center">
              No groups found. Create one to get started!
            </p>
          )}
        </div>
      )}

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Create a New Group"
      >
        <CreateGroupForm onClose={() => setIsModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default DashboardPage;
