import React from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/supabaseClient"; // Make sure this path is correct
import { useAuthStore } from "@store/useAuthStore";
import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export const Login = () => {
  const { loading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

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
