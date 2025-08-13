import { collection, doc, getDoc, getDocs, query, where } from "@firebase/firestore";
import React, { useEffect, useMemo, useState } from "react";
import toast from "react-hot-toast";

import { db } from "../../services/firebase";
import { UserProfile } from "../../types";
import Button from "../common/Button";
import Spinner from "../common/Spinner";

interface OwnersInputProps {
  initialOwnerUids: string[];
  onOwnersChange: (uids: string[]) => void;
}

const OwnersInput: React.FC<OwnersInputProps> = ({
  initialOwnerUids,
  onOwnersChange,
}) => {
  const [ownerProfiles, setOwnerProfiles] = useState<UserProfile[]>([]);
  const [emailInput, setEmailInput] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);

  // Memoize owner profiles to avoid unnecessary re-fetches
  const ownerUidsMemo = useMemo(
    () => new Set(initialOwnerUids),
    [initialOwnerUids]
  );

  useEffect(() => {
    const fetchOwnerProfiles = async () => {
      setIsLoading(true);
      if (initialOwnerUids.length === 0) {
        setOwnerProfiles([]);
        setIsLoading(false);
        return;
      }
      try {
        const profiles: UserProfile[] = [];
        for (const uid of initialOwnerUids) {
          const userRef = doc(db, "users", uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            profiles.push({ ...userSnap.data(), uid } as UserProfile);
          }
        }
        setOwnerProfiles(profiles);
      } catch (error) {
        console.error("Error fetching owner profiles:", error);
        toast.error("Could not load owner details.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchOwnerProfiles();
  }, [initialOwnerUids]);

  // Debounced search for users by email
  useEffect(() => {
    const searchUsers = async () => {
      if (emailInput.trim().length < 3) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const searchTerm = emailInput.trim().toLowerCase();
        const q = query(
          collection(db, "users"),
          where("email", ">=", searchTerm),
          where("email", "<=", searchTerm + "\uf8ff")
        );
        const querySnapshot = await getDocs(q);
        const users: UserProfile[] = [];
        querySnapshot.forEach((doc) => {
          if (!ownerUidsMemo.has(doc.id)) {
            users.push({ ...doc.data(), uid: doc.id } as UserProfile);
          }
        });
        setSearchResults(users);
      } catch (error) {
        console.error("Error searching for users:", error);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimeout = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(debounceTimeout);
  }, [emailInput, ownerUidsMemo]);

  const handleSelectUser = (user: UserProfile) => {
    onOwnersChange([...initialOwnerUids, user.uid]);
    setEmailInput("");
    setSearchResults([]);
  };

  const handleRemoveOwner = (uidToRemove: string) => {
    if (initialOwnerUids.length <= 1) {
      toast.error("A group must have at least one owner.");
      return;
    }
    onOwnersChange(initialOwnerUids.filter((uid) => uid !== uidToRemove));
  };

  return (
    <div>
      <label className="label-style">Group Owners</label>
      <div className="relative">
        <input
          type="email"
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder="Search to add owner by email..."
          className="input-style"
        />
        {(isSearching ||
          searchResults.length > 0 ||
          emailInput.length >= 3) && (
          <ul className="absolute z-10 w-full bg-dark-bg border border-dark-border rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
            {isSearching && (
              <li className="px-3 py-2 text-dark-text-secondary">
                Searching...
              </li>
            )}
            {!isSearching &&
              searchResults.map((user) => (
                <li
                  key={user.uid}
                  onClick={() => handleSelectUser(user)}
                  className="px-3 py-2 hover:bg-dark-surface cursor-pointer flex items-center gap-2"
                >
                  <img
                    src={user.photoURL}
                    alt={user.displayName}
                    className="w-8 h-8 rounded-full"
                  />
                  <div>
                    <p className="font-semibold">{user.displayName}</p>
                    <p className="text-xs text-dark-text-secondary">
                      {user.email}
                    </p>
                  </div>
                </li>
              ))}
            {!isSearching &&
              searchResults.length === 0 &&
              emailInput.length >= 3 && (
                <li className="px-3 py-2 text-dark-text-secondary">
                  No matching users found.
                </li>
              )}
          </ul>
        )}
      </div>

      <div className="mt-3 space-y-2">
        {isLoading ? (
          <Spinner />
        ) : (
          ownerProfiles.map((profile) => (
            <li
              key={profile.uid}
              className="flex items-center justify-between bg-dark-bg p-2 rounded-md list-none"
            >
              <div className="flex items-center gap-2">
                <img
                  src={profile.photoURL}
                  alt={profile.displayName}
                  className="w-8 h-8 rounded-full"
                />
                <div>
                  <p className="font-semibold">{profile.displayName}</p>
                  <p className="text-xs text-dark-text-secondary">
                    {profile.email}
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="danger"
                size="sm"
                onClick={() => handleRemoveOwner(profile.uid)}
                disabled={initialOwnerUids.length <= 1}
              >
                Remove
              </Button>
            </li>
          ))
        )}
      </div>
      <style>{`.input-style { display: block; width: 100%; background-color: #2a2a2a; border: 1px solid #444; color: #e0e0e0; border-radius: 0.375rem; padding: 0.5rem 0.75rem; } .label-style { display: block; font-size: 0.875rem; font-weight: 500; color: #a0a0a0; margin-bottom: 0.25rem; }`}</style>
    </div>
  );
};

export default OwnersInput;
