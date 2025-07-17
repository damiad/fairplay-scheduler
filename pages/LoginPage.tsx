import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup } from '@firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { useAuth } from '../hooks/useAuth';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      toast.success('Signed in successfully!');
      navigate('/');
    } catch (error: any) {
      console.error("Authentication error: ", error);
      toast.error(error.message || 'Failed to sign in.');
    }
  };

  if (loading || user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-dark-bg">
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-dark-bg text-dark-text p-4">
        <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-white mb-2">🏆 FairPlay Scheduler</h1>
            <p className="text-lg text-dark-text-secondary">Fair event sign-ups for everyone.</p>
        </div>
        <div className="bg-dark-surface p-8 rounded-lg shadow-2xl max-w-sm w-full text-center">
            <h2 className="text-2xl font-bold mb-2">Welcome Googler!</h2>
            <p className="text-dark-text-secondary mb-6">Sign in to continue.</p>
            <Button onClick={handleGoogleSignIn} className="w-full bg-primary hover:bg-blue-600">
                <svg className="w-5 h-5 mr-2" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l8.06 6.21C12.43 13.72 17.74 9.5 24 9.5z"></path>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                    <path fill="#FBBC05" d="M10.62 27.58c-.52-1.57-.82-3.24-.82-5.04s.3-3.47.82-5.04l-8.06-6.21C.96 15.7 0 20.05 0 24.55s.96 8.85 2.56 12.78l8.06-6.75z"></path>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-8.06 6.21C6.51 42.62 14.62 48 24 48z"></path>
                    <path fill="none" d="M0 0h48v48H0z"></path>
                </svg>
                Sign in with Google
            </Button>
            <p className="text-xs text-dark-text-secondary mt-4">Restricted to @google.com accounts.</p>
        </div>
    </div>
  );
};

export default LoginPage;