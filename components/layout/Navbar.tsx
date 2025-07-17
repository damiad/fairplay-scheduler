import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { signOut } from '@firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../hooks/useAuth';
import toast from 'react-hot-toast';

const Navbar: React.FC = () => {
  const { user, userProfile } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Signed out successfully');
      navigate('/login');
    } catch (error) {
      console.error("Error signing out: ", error);
      toast.error('Failed to sign out');
    }
  };

  return (
    <nav className="bg-dark-surface shadow-md">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center py-3">
          <Link to="/" className="text-xl font-bold text-primary flex items-center gap-2">
            🏆 FairPlay Scheduler
          </Link>
          {user && userProfile && (
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <img src={userProfile.photoURL} alt={userProfile.displayName} className="w-8 h-8 rounded-full" />
                <span className="text-sm font-medium text-dark-text-secondary hidden sm:block">{userProfile.displayName}</span>
              </div>
              <button
                onClick={handleLogout}
                className="bg-danger text-white px-3 py-1.5 rounded-md text-sm font-semibold hover:bg-red-600 transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;