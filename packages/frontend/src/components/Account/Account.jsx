import React, { useState, useEffect } from "react";
import { ConfirmPasswordForm } from "../Form/Password";
import { AccountProfile } from "../Profile/AccountProfile";
import { FamilyGroupForm } from "../Form/FamilyGroupForm";
import { useAuthStore } from "@store/useAuthStore";
import { useProfileStore } from "@store/useProfileStore";
import { NotificationPreferences } from "@components/Notifications/NotificationPreferences";
import { supabase } from "@/supabaseClient";

const pages = [
  { key: "Profile", component: <AccountProfile /> },
  { key: "Password", component: <ConfirmPasswordForm /> },
  { key: "Host", component: <FamilyGroupForm /> },
  { key: "Notifs", component: <NotificationPreferences /> },
];

export const Account = () => {
  const [activeTab, setActiveTab] = useState("Profile");
  const { profile, fetchAndSetUserProfile } = useProfileStore();
  const user = useAuthStore.getState().user;

  useEffect(() => {
    if (user?.id) fetchAndSetUserProfile(user.id);
  }, [user?.id]);

  const currentComponent = pages.find((p) => p.key === activeTab)?.component;

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      {/* Profile banner */}
      <div className="bg-[#0e9496] rounded-2xl p-5 flex flex-col items-center gap-2">
        <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-2xl">
          👤
        </div>
        <p className="text-white font-bold text-lg">{profile?.name || user?.email?.split("@")[0] || "—"}</p>
        <p className="text-white/80 text-sm">{user?.email}</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white border border-[#c8e8e9] rounded-xl p-1">
        {pages.map(({ key }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex-1 py-2 text-xs font-medium rounded-lg transition-all ${
              activeTab === key
                ? "bg-[#0e9496] text-white"
                : "text-[#3d6e70] hover:bg-[#f0fafa]"
            }`}
          >
            {key}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="bg-white border border-[#c8e8e9] rounded-2xl p-5">
        {currentComponent}
      </div>

      {/* Sign out */}
      <button
        onClick={() => supabase.auth.signOut()}
        className="w-full flex items-center gap-3 bg-white border border-[#c8e8e9] rounded-xl px-4 py-3.5 text-[#dc2626] font-medium text-sm"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
        </svg>
        Sign Out
      </button>
    </div>
  );
};
