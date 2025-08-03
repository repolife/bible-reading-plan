import { useEffect } from 'react'; // Keep useEffect if needed for other things, but not for auth listener here
import {useAuthStore} from "@store/useAuthStore"; 
import { Loader } from '../Shared/Loader';
import { useNavigate, useLocation } from 'react-router-dom';
import { useProfileStore } from '@store/useProfileStore';
export const ProtectedRoute = ({ children }) => {

  const { isAuthenticated, loading, profile,  user } = useAuthStore(); 




  const navigate = useNavigate()
  const location = useLocation();




useEffect(() => {
  if (loading) return; 
  if (!isAuthenticated) {
    navigate('/login');  }
}, [isAuthenticated, loading, navigate]);

useEffect(() => {
  if (loading) return;
  

  const alreadyOnProfileRoute = location.pathname === '/profile';
  
  if (!profile && !alreadyOnProfileRoute) {
    navigate('/profile');
  } 
  navigate('/')
}, [profile, loading, location.pathname, navigate]);

useEffect(() => {
  if(!user) return
  useProfileStore.getState().fetchAndSetUserProfile(user.id);
}, [user])


if (loading) {
  return <Loader/>;
}

      


  return children;
};