import React from 'react'
import { Auth } from '@supabase/auth-ui-react'  
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { supabase } from '@/supabaseClient'; // Make sure this path is correct

export const Login = () => {
         return (<div className=' flex flex-col items-center'>
            
            <div className='w-1/2'>
            <Auth supabaseClient={supabase} view='sign_in' appearance={{ theme: ThemeSupa }} providers={[]} />
            </div>
            </div>)  
    }

