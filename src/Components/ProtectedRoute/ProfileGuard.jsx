import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@store/useAuthStore';
import { useProfileStore } from '@store/useProfileStore';

export const ProfileGuard = () => {
  const {  loading, isAuthenticated } = useAuthStore();
  const {profile, loading: profileLoading } = useProfileStore()

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading || profileLoading) return;

    const alreadyOnProfileRoute = location.pathname === '/profile';
    console.log('protected')

    if (profile === undefined && !alreadyOnProfileRoute && isAuthenticated) {
      navigate('/profile');
    }
  }, [profile, loading, location.pathname, navigate, isAuthenticated]);

  return null;
};