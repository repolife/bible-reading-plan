import React, { useState } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/supabaseClient"; // Make sure this path is correct
import { useAuthStore } from "@store/useAuthStore";
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export const Login = () => {
  const { loading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [resetMessage, setResetMessage] = useState('');

  useEffect(() => {
    if (isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [loading, location.pathname, navigate, isAuthenticated]);

  // Custom theme appearance for Supabase Auth UI
  const customTheme = {
    ...ThemeSupa,
    default: {
      ...ThemeSupa.default,
      colors: {
        ...ThemeSupa.default.colors,
        brand: '#3b82f6', // brand-primary color
        brandAccent: '#1d4ed8', // brand-600 color
        inputBackground: '#f9fafb', // neutral-50
        inputText: '#111827', // neutral-900
        inputBorder: '#d1d5db', // neutral-300
        inputLabelText: '#374151', // neutral-700
        anchorTextColor: '#3b82f6', // brand-primary
        buttonText: '#ffffff',
        dividerBackground: '#e5e7eb', // neutral-200
        messageText: '#374151', // neutral-700
        messageTextDanger: '#dc2626', // red-600
      },
    },
    dark: {
      ...ThemeSupa.dark,
      colors: {
        ...ThemeSupa.dark.colors,
        brand: '#3b82f6', // brand-primary color
        brandAccent: '#1d4ed8', // brand-600 color
        inputBackground: '#1f2937', // neutral-800
        inputText: '#f9fafb', // neutral-100
        inputBorder: '#4b5563', // neutral-600
        inputLabelText: '#d1d5db', // neutral-300
        anchorTextColor: '#60a5fa', // brand-400
        buttonText: '#ffffff',
        dividerBackground: '#374151', // neutral-700
        messageText: '#d1d5db', // neutral-300
        messageTextDanger: '#f87171', // red-400
      },
    },
  };

  return (
    <div className="flex flex-col items-center min-h-screen bg-neutral-50 dark:bg-neutral-900 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-lg p-6 border border-neutral-200 dark:border-neutral-700">
          <h1 className="text-2xl font-bold text-center text-neutral-900 dark:text-neutral-100 mb-6">
            Welcome Back
          </h1>
          
          <Auth
            supabaseClient={supabase}
            view="sign_in"
            showLinks={false}
            appearance={{ theme: customTheme }}
            providers={[]}
            theme="dark"
          />
          
          {/* Custom Forgot Password Link */}
          <div className="mt-4 text-center">
            <button
              onClick={() => setShowForgotPassword(true)}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm underline"
            >
              Forgot your password?
            </button>
          </div>
          
          {/* Forgot Password Modal */}
          {showForgotPassword && (
            <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-neutral-800 rounded-lg shadow-2xl w-full max-w-md p-6">
                <h2 className="text-xl font-bold text-neutral-900 dark:text-neutral-100 mb-4">
                  Reset Password
                </h2>
                
                <p className="text-neutral-600 dark:text-neutral-400 mb-4">
                  Enter your email address and we'll send you a link to reset your password.
                </p>
                
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 text-black bg-white dark:bg-neutral-800 dark:text-white border border-neutral-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent shadow-sm mb-4"
                />
                
                {resetMessage && (
                  <div className={`p-3 rounded-lg mb-4 text-sm ${
                    resetMessage.includes('Check your email') 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {resetMessage}
                  </div>
                )}
                
                <div className="flex gap-3">
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setEmail('');
                      setResetMessage('');
                    }}
                    className="flex-1 px-4 py-2 text-neutral-600 dark:text-neutral-400 hover:text-neutral-800 dark:hover:text-neutral-200 border border-neutral-300 dark:border-neutral-600 rounded-lg"
                  >
                    Cancel
                  </button>
                  
                  <button
                    onClick={async () => {
                      if (!email) {
                        setResetMessage('Please enter your email address');
                        return;
                      }
                      
                      try {
                        const { error } = await supabase.auth.resetPasswordForEmail(email, {
                          redirectTo: `${window.location.origin}/reset-password`
                        });
                        
                        if (error) {
                          setResetMessage(error.message);
                        } else {
                          setResetMessage('Check your email for a password reset link');
                        }
                      } catch (error) {
                        setResetMessage('An error occurred. Please try again.');
                      }
                    }}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                  >
                    Send Reset Link
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
        
        <div className="mt-4 text-center">
          <span className="text-neutral-600 dark:text-neutral-400 text-sm">
            This is being tested. You'll be invited to create an account soon.
          </span>
        </div>
      </div>
    </div>
  );
};
