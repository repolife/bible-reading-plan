import React, { useState, useEffect } from "react";
import { Card, Button } from "@material-tailwind/react";
import { ConfirmPasswordForm } from "../Form/Password";
import { AccountProfile } from "../Profile/AccountProfile";
import { FamilyGroupForm } from "../Form/FamilyGroupForm";
import { useAuthStore } from "@store/useAuthStore";
import { useProfileStore } from "@store/useProfileStore";
import { NotificationPreferences } from "../Notifications/NotificationPreferences";

export const Account = () => {
  const [activeTab, setActiveTab] = useState("Update Password");
  const { profile, fetchAndSetUserProfile } = useProfileStore();
  const user = useAuthStore.getState().user;



  const pages = [
    {
      key: "Update Password",
      component: <ConfirmPasswordForm />,
    },
    {
      key: "Profile",
      component: <AccountProfile />,
    },
    {
      key: "Host Details",
      component: <FamilyGroupForm />,
    },
    {
      key: "Notification Preferences",
      component: <NotificationPreferences />,
    },
  ];

  useEffect(() => {
    if(user?.id) { 
     fetchAndSetUserProfile(user?.id);
    }
  }, [user?.id]);


  useEffect(() => {
  if(!user?.id) {
    setActiveTab(pages[0].key);
  }
  if(profile?.has_password && !profile?.family_id) { 
    setActiveTab(pages[1].key);
  } else if(profile?.has_password && profile?.family_id) {
    setActiveTab(pages[2].key);
  } else {
    setActiveTab(pages[0].key);
  }
}, [profile, user?.id]);

  const currentComponent = pages.find(page => page.key === activeTab)?.component;

  return (
    <div className="w-full max-w-4xl mx-auto p-3 sm:p-6">
      {/* Custom Tabs */}
      <div className="w-full mb-4 sm:mb-6">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          {pages.map(({ key }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 px-2 sm:px-4 py-2 text-xs sm:text-sm font-medium rounded-md transition-all duration-200 ${
                activeTab === key
                  ? "bg-white text-blue-600 shadow-sm"
                  : "text-gray-600 hover:text-gray-800 hover:bg-gray-50"
              }`}
            >
              {key}
            </button>
          ))}
        </div>
      </div>
      
      {/* Tab Content */}
      <div className="mt-4 sm:mt-6 w-full">
        <Card className="p-3 sm:p-6 shadow-lg">
          {currentComponent}
        </Card>
      </div>
    </div>
  );
};
