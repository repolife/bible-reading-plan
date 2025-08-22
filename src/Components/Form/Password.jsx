import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { Input, Typography, Card, Button } from "@material-tailwind/react";
import { supabase } from "@/supabaseClient";
import { toast } from "react-toastify";
import { useEffect } from "react";
import { useProfileStore } from "../../store/useProfileStore";

export const ConfirmPasswordForm = ({
  setIsStepValid,
  activeStep,
  stepIndex,
}) => {
  const [isPasswordSet, setIsPasswordSet] = useState(false);
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm();

  const { profile } = useProfileStore();
  const passwordAction = profile?.has_password ? "Update" : "Set";
  
  useEffect(() => {
    if (profile?.has_password) {
      setIsPasswordSet(true);
    }
  }, [profile]);

  const onSubmit = async ({ password }) => {
    const { error, data } = await supabase.auth.updateUser({ password });

    if (error) {
      setError("password", { message: error.message });
      return;
    }

    const { error: profileError, data: profileData } = await supabase
      .from("profiles")
      .upsert({ id: data.user.id, has_password: true });

    if (profileError) {
      setError("password", { message: profileError.message });
      return;
    }

    console.log("profile created with password", profileData);
    toast.success("✅ Password updated successfully!");
    
    // Refresh the profile in the store to update has_password status
    useProfileStore.getState().fetchAndSetUserProfile(data.user.id);
  };

  useEffect(() => {
    if (!setIsStepValid) return;
    if (!profile || (!profile.has_password && setIsStepValid)) {
      setIsStepValid(false);
      return;
    } else {
      if (activeStep === stepIndex && setIsStepValid) {
        setIsStepValid(true);
      }
    }
  }, [isValid, activeStep, stepIndex, setIsStepValid, profile]);

  const password = watch("password");

  return (
    <Card className="p-4 sm:p-6 w-full max-w-sm sm:max-w-md mx-auto mt-6 sm:mt-10 shadow-lg">
      <Typography variant="h5" color="primary" className="mb-4">
        {isPasswordSet ? " Your Password" : "Set Your Password"}
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Input
            type="password"
            label="New Password"
            className="!border-t-neutral-300 dark:!border-t-neutral-600 focus:!border-t-brand-primary !text-neutral-900 dark:!text-neutral-100 !bg-neutral-50 dark:!bg-neutral-800"
            labelProps={{
              className: "!text-neutral-700 dark:!text-neutral-300",
            }}
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
            error={!!errors.password}
          />
          {errors.password && (
            <Typography variant="small" color="red">
              {errors.password.message}
            </Typography>
          )}
        </div>

        <div>
          <Input
            type="password"
            label="Confirm Password"
            className="!border-t-neutral-300 dark:!border-t-neutral-600 focus:!border-t-brand-primary !text-neutral-900 dark:!text-neutral-100 !bg-neutral-50 dark:!bg-neutral-800"
            labelProps={{
              className: "!text-neutral-700 dark:!text-neutral-300",
            }}
            {...register("confirmPassword", {
              required: "Please confirm your password",
              validate: (value) =>
                value === password || "Passwords do not match",
            })}
            error={!!errors.confirmPassword}
          />
          {errors.confirmPassword && (
            <Typography variant="small" color="red">
              {errors.confirmPassword.message}
            </Typography>
          )}
        </div>

        <Button 
          type="submit" 
          disabled={isSubmitting} 
          className="w-full bg-primary hover:bg-brand-600 text-white py-3 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Updating..." : `${passwordAction} Password`}
        </Button>
      </form>
    </Card>
  );
};
