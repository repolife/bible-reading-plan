import React, { useState } from "react";
import { AccountProfile } from "../Profile/AccountProfile";
import { FamilyGroupForm } from "./FamilyGroupForm";
import { Card, Stepper, Step, Button } from "@material-tailwind/react";

export const StepForm = () => {
  const steps = [<AccountProfile />, <FamilyGroupForm />];
  const [activeStep, setActiveStep] = useState(0);

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
      className="flex flex-col items-center p-8 rounded-lg shadow-lg bg-white w-full"
      shadow={false}
    >
      <div shadow={false} className="self-center text-center">
        <Stepper className="w-full" activeStep={activeStep}>
          {steps.map((_, index) => (
            <Step key={index}>{index + 1}</Step>
          ))}
        </Stepper>
        {steps[activeStep]}
      </div>

      <div className="mt-16 flex justify-between w-full">
        <Button onClick={prev} disabled={isFirst}>
          Prev
        </Button>
        <Button onClick={next} disabled={isLast}>
          Next
        </Button>
      </div>
    </Card>
  );
};
