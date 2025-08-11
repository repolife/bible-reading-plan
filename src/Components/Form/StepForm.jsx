import React, { useState } from "react";
import { AccountProfile } from "../Profile/AccountProfile";
import { FamilyGroupForm } from "./FamilyGroupForm";
import { Card, Timeline, Button } from "@material-tailwind/react";
import { ConfirmPasswordForm } from "./Password";
import { useAuthStore } from "@store/useAuthStore";

export const StepForm = () => {
  const user = useAuthStore.getState().user;

  const [activeStep, setActiveStep] = useState(0);
  const [isStepValid, setIsStepValid] = useState(false);

  const steps = [
    <ConfirmPasswordForm
      activeStep={activeStep}
      stepIndex={0}
      setIsStepValid={setIsStepValid}
    />,
    <AccountProfile
      activeStep={activeStep}
      stepIndex={1}
      setIsStepValid={setIsStepValid}
    />,
    <FamilyGroupForm
      activeStep={activeStep}
      stepIndex={2}
      setIsStepValid={setIsStepValid}
    />,
  ];

  const CurrentStep = steps[activeStep];

  const isFirst = activeStep === 0;
  const isLast = activeStep === steps.length - 1;

  const next = () => {
    if (!isLast) setActiveStep((prev) => prev + 1);
  };

  const prev = () => {
    if (!isFirst) setActiveStep((prev) => prev - 1);
  };

  return (
    <Card
      className="flex flex-col h-full items-center p-8 rounded-lg shadow-lg bg-white w-full"
      shadow={false}
    >
      <div shadow={false} className="self-center text-center">
        <Timeline className="w-full mb-5" activeStep={activeStep}>
          {steps.map((_, index) => (
            <Timeline.Item ckey={index}>{index + 1}</Timeline.Item>
          ))}
        </Timeline>
        {steps[activeStep]}
      </div>

      <div className="mt-16 flex justify-between w-full">
        <Button onClick={prev} disabled={isFirst}>
          Prev
        </Button>
        <Button onClick={next} disabled={isLast || !isStepValid}>
          Next
        </Button>
      </div>
    </Card>
  );
};
