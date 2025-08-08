import React, { useState } from "react";
import {
  Card,
  Tabs,
  TabsHeader,
  TabsBody,
  Tab,
  TabPanel,
} from "@material-tailwind/react";
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
    <Tabs value={defaultTab}>
      <TabsHeader>
        {pages.map(({ key }) => (
          <Tab
            className="text bg-accent flex justify-between"
            key={key}
            value={key}
          >
            {key}
          </Tab>
        ))}
      </TabsHeader>
      <TabsBody className="h-lvh">
        {pages.map(({ key, component }) => (
          <TabPanel key={key} value={key}>
            <Card className="p-6 max-w-md mx-auto mt-10 shadow-lg">
              {component}
            </Card>
          </TabPanel>
        ))}
      </TabsBody>
    </Tabs>
  );
};
