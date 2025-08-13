import React, { useState } from "react";
import { AccountProfile } from "../Profile/AccountProfile";
import { FamilyGroupForm } from "./FamilyGroupForm";
import { Card } from "@material-tailwind/react";
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
      className="flex flex-col h-full items-center p-4 sm:p-8 rounded-lg shadow-lg w-full sm:w-11/12 md:w-4/5 lg:w-3/4 xl:w-1/2 mx-auto bg-white"
      shadow={false}
    >
      {/* Custom Stepper */}
      <div className="w-full mb-8">
        <div className="flex items-center justify-center space-x-4">
          {steps.map((_, index) => (
            <div key={index} className="flex items-center">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold transition-all duration-300 ${
                  index <= activeStep
                    ? "bg-blue-500 text-white shadow-lg"
                    : "bg-gray-200 text-gray-500"
                }`}
              >
                {index + 1}
              </div>
              {index < steps.length - 1 && (
                <div
                  className={`w-20 h-1 mx-4 rounded-full transition-all duration-300 ${
                    index < activeStep ? "bg-blue-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Step Content */}
      <div className="w-full flex-1">
        {steps[activeStep]}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex justify-between w-full">
        <button 
          onClick={prev} 
          disabled={isFirst}
          className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Previous
        </button>
        <button 
          onClick={next} 
          disabled={isLast || !isStepValid}
          className="px-6 py-2 bg-brand-primary hover:bg-brand-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {isLast ? "Finish" : "Next"}
        </button>
      </div>
    </Card>
  );
};