import { useEffect } from 'react'; // Keep useEffect if needed for other things, but not for auth listener here
import {useAuthStore} from "@store/useAuthStore"; // Ensure correct path
import { Auth } from '@supabase/auth-ui-react'  
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/supabaseClient'; // Make sure this path is correct
import { ProfileForm } from '../Form/ProfileForm';
import { Loader } from '../Shared/Loader';
export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, profile, profiles, user } = useAuthStore(); 



useEffect(() => {
  if(!user) return
  useAuthStore.getState().fetchAndSetUserProfile(user.id);
}, [user])


if (loading) {
  return <Loader/>;
}
  // If not authenticated, redirect to login
  if (!isAuthenticated) {
      return (<Auth supabaseClient={supabase} appearance={{ theme: ThemeSupa }} providers={['']} />)  }


      
     

      if(!profile) {
       return  <ProfileForm/>
        }

  return children;
};