import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '@store/useAuthStore';

export const ProfileGuard = () => {
  const { profile, loading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;

    const alreadyOnProfileRoute = location.pathname === '/profile';
    console.log('protected')

    if (profile === undefined && !alreadyOnProfileRoute && isAuthenticated) {
      navigate('/profile');
    }
  }, [profile, loading, location.pathname, navigate, isAuthenticated]);

  return null;
};