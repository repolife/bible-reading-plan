import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Input,
  Typography,
  Textarea,
  Card,
  Checkbox,
  Button,
} from "@material-tailwind/react";
import Autocomplete from "react-google-autocomplete";
import { useAuthStore } from "@store/useAuthStore";
import { supabase } from "@/supabaseClient";
import { toast } from "react-toastify";
import { useProfileStore } from "../../store/useProfileStore";
import { Spinner } from "../Shared/Spinner/Spinner";

const SERVANT_ROLES = [
  'Adult Teaching',
  'Care & Support',
  'Discipleship',
  'Elder',
  'Encouragement',
  'Evangelism',
  'Feast Planning',
  'Feasts',
  'Kid Ministry',
  "Men's Events",
  'New Member Care',
  'Nursery',
  'On-Call Support',
  'Outreach Planning',
  'Prayer',
  'Shabbat Schedule Coordination',
  'Teen Ministry',
  "Women's Events",
  'Worship',
]

export const AccountProfile = ({ setIsStepValid }) => {
  // Get user, profile (existing data), loading state, and allProfiles for suggestions
  const { user, loading: authLoading } = useAuthStore();
  const {
    profile: existingProfile,
    loading: profileLoading,
    allProfiles,
    fetchAndSetUserProfile,
  } = useProfileStore();

  const [servantRoles, setServantRoles] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  console.log("existingProfile", existingProfile);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset, // Use reset to pre-fill the form
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm({
    defaultValues: {
      birthday: "",
      email_alerts: false,
      name: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    fetchAndSetUserProfile(user?.id);
  }, [user?.id]);

  // Effect to pre-fill the form with existing profile data
  useEffect(() => {
    if (existingProfile) {
      const formattedBirthday = existingProfile.birthday
        ? existingProfile.birthday.split("T")[0]
        : "";
      reset({
        birthday: formattedBirthday,
        name: existingProfile.name || "",
        email_alerts: existingProfile.email_alerts,
      });
      setServantRoles(existingProfile.servant_roles || []);
      setAvatarUrl(existingProfile.avatar_url || null);
    }
  }, [existingProfile, reset]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !user?.id) return;

    setAvatarPreview(URL.createObjectURL(file));
    setAvatarUploading(true);

    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (uploadError) {
      toast.error('Failed to upload photo: ' + uploadError.message);
      setAvatarPreview(null);
      setAvatarUploading(false);
      return;
    }

    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    const url = `${data.publicUrl}?t=${Date.now()}`;

    await supabase.from('profiles').update({ avatar_url: url }).eq('id', user.id);
    setAvatarUrl(url);
    setAvatarUploading(false);
    toast.success('Photo updated!');
    useProfileStore.getState().fetchAndSetUserProfile(user.id);
  };

  useEffect(() => {
    if (setIsStepValid) {
      setIsStepValid(isValid);
    }
  }, [setIsStepValid, isValid]);

  // Extract unique family names from allProfiles for suggestions
  const uniqueFamilyNames = useCallback(() => {
    if (!allProfiles || allProfiles.length === 0) return [];
    return Array.from(
      new Set(allProfiles.map((p) => p.family_last_name).filter(Boolean))
    );
  }, [allProfiles]);

  console.log("all", allProfiles);

  // Effect to handle clicks outside the autocomplete to hide suggestions
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        autocompleteContainerRef.current &&
        !autocompleteContainerRef.current.contains(event.target)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Handle selecting a suggestion
  const handleSelectSuggestion = (suggestion) => {
    setValue("family_last_name", suggestion, { shouldValidate: true });
    setShowSuggestions(false);
  };

  // Custom validation for family_last_name (e.g., enforce selection from existing)
  const validateFamilyName = (value) => {
    if (!value) return "Family Last Name is required";
    // This validation is primarily for client-side UX.
    // True uniqueness enforcement should be handled by your Supabase table's unique constraint.
    return true;
  };

  const onSubmit = async (data) => {
    if (!user || !user.id) {
      console.error("User not logged in or user ID not available.");
      toast.error("Error: User not logged in. Please log in again.");
      return;
    }

    const profileData = {
      id: user.id,
      birthday: data.birthday,
      name: data.name,
      email_alerts: data.email_alerts,
      ...(existingProfile?.is_admin && { servant_roles: servantRoles }),
    };

    try {
      // Use upsert to either insert a new profile or update an existing one
      // based on the 'id' field.
      const { error } = await supabase.from("profiles").upsert(profileData, {
        onConflict: "id", // Specify 'id' as the conflict target for upsert
      });

      if (error) {
        console.error(
          "Supabase error updating profile:",
          error.message,
          error.code
        );
        // Handle specific Supabase errors, e.g., unique constraint violation
        if (error.code === "23505") {
          // Common PostgreSQL unique violation error code
          toast.error(
            "Error: This family last name already exists. Please choose another or select from suggestions."
          );
        } else {
          toast.success("Error updating profile: " + error.message);
        }
      } else {
        toast.success("Profile updated successfully! 🕎");
        // IMPORTANT: Re-fetch the user's profile in the store to reflect changes
        // This updates the 'profile' state in your Zustand store,
        // ensuring other components get the latest data.
        useProfileStore.getState().fetchAndSetUserProfile(user.id);
      }
    } catch (error) {
      console.error("General error updating profile:", error);
      toast.error("An unexpected error occurred while updating profile.");
    }
  };

  // Show loading state from the store while auth or profile is being fetched
  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <Card className="flex flex-col items-center justify-center p-4 sm:p-8 rounded-lg shadow-lg bg-neutral-50 dark:bg-neutral-800">
          <Spinner size="md" text="Loading profile..." />
        </Card>
      </div>
    );
  }

  // If user is not logged in (should be caught by ProtectedRoute, but good fallback)
  if (!user) {
    return (
      <Card className="flex flex-col items-center p-4 sm:p-8 rounded-lg shadow-lg bg-white">
        <Typography variant="h5" color="red">
          You must be logged in to view your profile.
        </Typography>
      </Card>
    );
  }

  return (
    <>
      <Typography variant="h4" color="primary">
        Your Profile
      </Typography>
      <Typography color="primary" className="mt-1 font-normal">
        Update your details below.
      </Typography>
      {/* Avatar */}
      <div className="flex flex-col items-center gap-3 mt-6">
        <div
          className="relative w-24 h-24 rounded-full overflow-hidden bg-neutral-200 dark:bg-neutral-700 cursor-pointer border-2 border-[#0e9496]"
          onClick={() => avatarInputRef.current?.click()}
        >
          {(avatarPreview || avatarUrl) ? (
            <img
              src={avatarPreview || avatarUrl}
              alt="Profile"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400 text-3xl">
              👤
            </div>
          )}
          {avatarUploading && (
            <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={() => avatarInputRef.current?.click()}
          className="text-sm text-[#0e9496] hover:underline"
        >
          {avatarUrl ? 'Change photo' : 'Upload photo'}
        </button>
        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      <form className="mt-8 mb-2 w-full" onSubmit={handleSubmit(onSubmit)}>
          <div className="mb-1 flex flex-col gap-6">
            <Typography variant="h6" color="primary" className="-mb-3">
              Email (Cannot be changed here)
            </Typography>
            {/* Display user's email from auth store (read-only) */}
            <Input
              size="lg"
              placeholder="user@example.com"
              value={user.email || ""}
              className="!border-t-neutral-300 dark:!border-t-neutral-600 focus:!border-t-brand-primary !text-neutral-900 dark:!text-neutral-100 !bg-neutral-50 dark:!bg-neutral-800"
              labelProps={{
                className: "before:content-none after:content-none",
              }}
            />

            <Typography variant="h6" color="primary" className="-mb-3">
              Name
            </Typography>
            <Input
              size="lg"
              placeholder="name"
              className="!border-t-neutral-300 dark:!border-t-neutral-600 focus:!border-t-brand-primary !text-neutral-900 dark:!text-neutral-100 !bg-neutral-50 dark:!bg-neutral-800"
              labelProps={{
                className: "before:content-none after:content-none",
              }}
              {...register("name")}
            />

            <div className="flex flex-row justify-between">
              <Typography variant="h6" color="primary" className="-mb-3">
                Received email alerts?
              </Typography>
              <Checkbox
                size="lg"
                className="!border-t-neutral-300 dark:!border-t-neutral-600 focus:!border-t-brand-primary !text-neutral-900 dark:!text-neutral-100 !bg-neutral-50 dark:!bg-neutral-800"
                labelProps={{
                  className: "before:content-none after:content-none",
                }}
                {...register("email_alerts")}
              />
            </div>

            <Typography variant="h6" color="primary" className="-mb-3">
              Birthday
            </Typography>
            <Input
              type="date"
              size="lg"
              placeholder="YYYY-MM-DD"
              className="!border-t-neutral-300 dark:!border-t-neutral-600 focus:!border-t-brand-primary !text-neutral-900 dark:!text-neutral-100 !bg-neutral-50 dark:!bg-neutral-800"
              labelProps={{
                className: "before:content-none after:content-none",
              }}
              {...register("birthday", {
                required: "Birthday is required",
                validate: (value) => {
                  if (!value) return true;
                  const today = new Date();
                  const birthDate = new Date(value);
                  let age = today.getFullYear() - birthDate.getFullYear();
                  const m = today.getMonth() - birthDate.getMonth();
                  if (
                    m < 0 ||
                    (m === 0 && today.getDate() < birthDate.getDate())
                  ) {
                    age--;
                  }
                  return age >= 18 || "You must be at least 18 years old.";
                },
              })}
            />
            {errors.birthday && (
              <Typography color="red" variant="small">
                {errors.birthday.message}
              </Typography>
            )}

            <Typography variant="h6" color="primary" className="-mb-3">
              Servant Roles
            </Typography>
            {existingProfile?.is_admin ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {SERVANT_ROLES.map((role) => (
                  <label key={role} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={servantRoles.includes(role)}
                      onChange={() =>
                        setServantRoles((prev) =>
                          prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
                        )
                      }
                      className="w-4 h-4 rounded border-neutral-300 text-[#0e9496] focus:ring-[#0e9496]"
                    />
                    <span className="text-sm text-neutral-800 dark:text-neutral-200">{role}</span>
                  </label>
                ))}
              </div>
            ) : servantRoles.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {servantRoles.map((role) => (
                  <span
                    key={role}
                    className="text-xs bg-[#e0f5f5] text-[#0e9496] dark:bg-[#0e9496]/20 dark:text-[#5ecfcf] px-2 py-1 rounded-full"
                  >
                    {role}
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-sm text-neutral-500 dark:text-neutral-400">No roles assigned</p>
            )}
          </div>
          <Button
            className="mt-6 w-full bg-primary hover:bg-brand-600 text-white py-3 px-6 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            type="submit"
            disabled={isSubmitting}
          >
            {isSubmitting ? "Saving..." : "Update Profile"}
          </Button>
        </form>
    </>
  );
};
