import React, { useState } from "react";
import { Card, Tabs } from "@material-tailwind/react";
import { ConfirmPasswordForm } from "../Form/Password";
import { AccountProfile } from "../Profile/AccountProfile";
import { FamilyGroupForm } from "../Form/FamilyGroupForm";

export const Account = () => {
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
  ];

  const defaultTab = pages[0].key;

  return (
    <Tabs defaultValue={defaultTab}>
      <Tabs.List className="w-full">
        {pages.map(({ key }) => (
          <Tabs.Trigger
            className="text bg-accent flex justify-between"
            key={key}
            value={key}
          >
            {key}
          </Tabs.Trigger>
        ))}
      </Tabs.List>
      <Tabs.List className="h-lvh">
        {pages.map(({ key, component }) => (
          <Tabs.Panel key={key} value={key}>
            <Card className="p-6 max-w-md mx-auto mt-10 shadow-lg">
              {component}
            </Card>
          </Tabs.Panel>
        ))}
      </Tabs.List>
    </Tabs>
  );
};
