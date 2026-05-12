import React, { useEffect } from "react";
import { Auth } from "@supabase/auth-ui-react";
import { ThemeSupa } from "@supabase/auth-ui-shared";
import { supabase } from "@/supabaseClient";
import { useAuthStore } from "@store/useAuthStore";
import { useNavigate } from "react-router-dom";

export const Login = () => {
  const { loading, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (isAuthenticated) navigate("/");
  }, [isAuthenticated]);

  const customTheme = {
    default: {
      colors: {
        brand: "#0e9496",
        brandAccent: "#0b7678",
        inputBackground: "#f0fafa",
        inputText: "#0b2020",
        inputBorder: "#c8e8e9",
        inputLabelText: "#3d6e70",
        anchorTextColor: "#0e9496",
        buttonText: "#ffffff",
        dividerBackground: "#c8e8e9",
        messageText: "#3d6e70",
        messageTextDanger: "#dc2626",
      },
    },
  };

  return (
    <div className="min-h-screen bg-[#f0fafa] flex flex-col items-center justify-start pt-12 px-5">
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-8">
        <div className="w-16 h-16 bg-[#0e9496] rounded-full flex items-center justify-center text-2xl">
          🕎
        </div>
        <h1 className="text-2xl font-bold text-[#0b2020]">Fellowship</h1>
        <p className="text-sm text-[#3d6e70]">Welcome back</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white border border-[#c8e8e9] rounded-2xl p-6 shadow-sm">
        <Auth
          supabaseClient={supabase}
          view="sign_in"
          showLinks={false}
          appearance={{ theme: customTheme }}
          providers={[]}
        />
        <div className="mt-3 text-center">
          <button
            onClick={async () => {
              const email = window.prompt("Enter your email to reset password:");
              if (!email) return;
              const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
              });
              if (error) alert(error.message);
              else alert("Check your email for a reset link.");
            }}
            className="text-sm text-[#0e9496] underline"
          >
            Forgot your password?
          </button>
        </div>
      </div>

      <p className="mt-6 text-xs text-[#3d6e70] text-center max-w-xs">
        This is being tested. You'll be invited to create an account soon.
      </p>
    </div>
  );
};
