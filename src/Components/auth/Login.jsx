import React from 'react'
import { Auth } from '@supabase/auth-ui-react'  
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/supabaseClient'; // Make sure this path is correct
import { useAuthStore } from '@store/useAuthStore';
import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';

export const Login = () => {
    const {  loading, isAuthenticated } = useAuthStore();
    const navigate = useNavigate();


    useEffect(() => {
    
    
        if (isAuthenticated) {
          navigate('/profile');
        } 
      
      }, [ loading, location.pathname, navigate, isAuthenticated]);
    


         return (<div className=' flex flex-col items-center'>
            
            <div className='w-1/2'>
            <Auth supabaseClient={supabase} view='sign_in'showLinks={false} appearance={{ theme: ThemeSupa }} providers={[]} />
            </div>
            <span>            This is being tested. You'll be invited to create an account soon. 
            </span>
            </div>)  
    }

