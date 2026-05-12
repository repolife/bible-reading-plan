import React, { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import {
  Input,
  Typography,
  Card,
  Checkbox,
  Button,
} from "@material-tailwind/react";
import { useAuthStore } from "@store/useAuthStore";
import { supabase } from "@/supabaseClient";
import { toast } from "react-toastify";
import { useProfileStore } from "../../store/useProfileStore";
import { useFamilyStore } from "../../store/useFamilyGroupStore";
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
  const { user, loading: authLoading } = useAuthStore();
  const {
    profile: existingProfile,
    loading: profileLoading,
    fetchAndSetUserProfile,
  } = useProfileStore();
  const { allFamilyGroups, fetchAllFamilyGroups } = useFamilyStore();

  const [servantRoles, setServantRoles] = useState([]);
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const avatarInputRef = useRef(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isValid },
  } = useForm({
    defaultValues: {
      birthday: "",
      email_alerts: false,
      name: "",
      family_id: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    fetchAndSetUserProfile(user?.id);
    fetchAllFamilyGroups();
  }, [user?.id]);

  useEffect(() => {
    if (existingProfile) {
      reset({
        birthday: existingProfile.birthday ? existingProfile.birthday.split("T")[0] : "",
        name: existingProfile.name || "",
        email_alerts: existingProfile.email_alerts || false,
        family_id: existingProfile.family_id || "",
      });
      setServantRoles(existingProfile.servant_roles || []);
      setAvatarUrl(existingProfile.avatar_url || null);
    }
  }, [existingProfile, reset]);

  useEffect(() => {
    if (setIsStepValid) setIsStepValid(isValid);
  }, [setIsStepValid, isValid]);

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

  const onSubmit = async (data) => {
    if (!user?.id) {
      toast.error("Error: User not logged in. Please log in again.");
      return;
    }

    const profileData = {
      id: user.id,
      birthday: data.birthday,
      name: data.name,
      email_alerts: data.email_alerts,
      family_id: data.family_id || null,
      ...(existingProfile?.is_admin && { servant_roles: servantRoles }),
    };

    try {
      const { error } = await supabase.from("profiles").upsert(profileData, { onConflict: "id" });

      if (error) {
        toast.error("Error updating profile: " + error.message);
      } else {
        toast.success("Profile updated successfully!");
        useProfileStore.getState().fetchAndSetUserProfile(user.id);
      }
    } catch (err) {
      toast.error("An unexpected error occurred while updating profile.");
    }
  };

  if (authLoading || profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <Card className="flex flex-col items-center justify-center p-4 sm:p-8 rounded-lg shadow-lg bg-neutral-50 dark:bg-neutral-800">
          <Spinner size="md" text="Loading profile..." />
        </Card>
      </div>
    );
  }

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
            <img src={avatarPreview || avatarUrl} alt="Profile" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400 text-3xl">👤</div>
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
        <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
      </div>

      <form className="mt-8 mb-2 w-full" onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-1 flex flex-col gap-6">

          <Typography variant="h6" color="primary" className="-mb-3">
            Email (Cannot be changed here)
          </Typography>
          <Input
            size="lg"
            placeholder="user@example.com"
            value={user.email || ""}
            readOnly
            className="!border-t-neutral-300 dark:!border-t-neutral-600 focus:!border-t-brand-primary !text-neutral-900 dark:!text-neutral-100 !bg-neutral-50 dark:!bg-neutral-800"
            labelProps={{ className: "before:content-none after:content-none" }}
          />

          <Typography variant="h6" color="primary" className="-mb-3">
            Name
          </Typography>
          <Input
            size="lg"
            placeholder="Name"
            className="!border-t-neutral-300 dark:!border-t-neutral-600 focus:!border-t-brand-primary !text-neutral-900 dark:!text-neutral-100 !bg-neutral-50 dark:!bg-neutral-800"
            labelProps={{ className: "before:content-none after:content-none" }}
            {...register("name")}
          />

          <Typography variant="h6" color="primary" className="-mb-3">
            Family Group
          </Typography>
          <select
            className="w-full px-3 py-2.5 border border-neutral-300 dark:border-neutral-600 rounded-lg bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#0e9496]"
            {...register("family_id")}
          >
            <option value="">— No family group —</option>
            {(allFamilyGroups || []).map((fg) => (
              <option key={fg.id} value={fg.id}>
                {fg.family_last_name}
              </option>
            ))}
          </select>

          <div className="flex flex-row justify-between">
            <Typography variant="h6" color="primary" className="-mb-3">
              Receive email alerts?
            </Typography>
            <Checkbox
              size="lg"
              className="!border-t-neutral-300 dark:!border-t-neutral-600 focus:!border-t-brand-primary !text-neutral-900 dark:!text-neutral-100 !bg-neutral-50 dark:!bg-neutral-800"
              labelProps={{ className: "before:content-none after:content-none" }}
              {...register("email_alerts")}
            />
          </div>

          <Typography variant="h6" color="primary" className="-mb-3">
            Birthday
          </Typography>
          <Input
            type="date"
            size="lg"
            className="!border-t-neutral-300 dark:!border-t-neutral-600 focus:!border-t-brand-primary !text-neutral-900 dark:!text-neutral-100 !bg-neutral-50 dark:!bg-neutral-800"
            labelProps={{ className: "before:content-none after:content-none" }}
            {...register("birthday", {
              required: "Birthday is required",
              validate: (value) => {
                if (!value) return true;
                const today = new Date();
                const birthDate = new Date(value);
                let age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
                return age >= 18 || "You must be at least 18 years old.";
              },
            })}
          />
          {errors.birthday && (
            <Typography color="red" variant="small">{errors.birthday.message}</Typography>
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
