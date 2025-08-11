import React from "react";
import { useForm } from "react-hook-form";
import { Input, Button, Typography, Card } from "@material-tailwind/react";
import { supabase } from "@/supabaseClient";
import { toast } from "react-toastify";
import { useEffect } from "react";
import { useProfileStore } from "../../store/useProfileStore";

export const ConfirmPasswordForm = ({
  setIsStepValid,
  activeStep,
  stepIndex,
}) => {
  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors, isSubmitting, isValid },
  } = useForm();

  const { profile } = useProfileStore();

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
    <Card className="p-6 max-w-md mx-auto mt-10 shadow-lg">
      <Typography variant="h5" color="blue-gray" className="mb-4">
        Confirm Your Password
      </Typography>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <Input
            type="password"
            label="New Password"
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

        <Button type="submit" disabled={isSubmitting} fullWidth>
          {isSubmitting ? "Updating..." : "Confirm Password"}
        </Button>
      </form>
    </Card>
  );
};
