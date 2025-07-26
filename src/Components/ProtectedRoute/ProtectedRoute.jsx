import { useEffect } from 'react'; // Keep useEffect if needed for other things, but not for auth listener here
import {useAuthStore} from "@store/useAuthStore"; // Ensure correct path
import { Auth } from '@supabase/auth-ui-react'  
import { Loader } from '../Shared/Loader';
import { useNavigate, useLocation } from 'react-router-dom';
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, profile,  user } = useAuthStore(); 


  console.log('proifle', profile)

  const navigate = useNavigate()
  const location = useLocation();




useEffect(() => {
  if (loading) return; 
  if (!isAuthenticated) {
    navigate('/signup');  }
}, [isAuthenticated, loading, navigate]);

useEffect(() => {
  if (loading) return;

  const alreadyOnProfileRoute = location.pathname === '/profile';
  
  if (!profile && !alreadyOnProfileRoute) {
    navigate('/profile');
  }
}, [profile, loading, location.pathname, navigate]);

useEffect(() => {
  if(!user) return
  useAuthStore.getState().fetchAndSetUserProfile(user.id);
}, [user])


if (loading) {
  return <Loader/>;
}

      


  return children;
};