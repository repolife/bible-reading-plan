import React, { useState, useEffect, useCallback, useRef } from "react";
import { useForm, Controller } from "react-hook-form";
import {
  Input,
  Button,
  Typography,
  Textarea,
  Card,
} from "@material-tailwind/react";
import Autocomplete from "react-google-autocomplete";

import { useAuthStore } from "@store/useAuthStore";
import { supabase } from "@/supabaseClient"; // Corrected Supabase client import path
import { toast } from "react-toastify";
import { useFamilyStore } from "@store/useFamilyGroupStore";
import { Spinner } from "@material-tailwind/react";
import { useMemo } from "react";
import { Chip } from "@material-tailwind/react";
import { useProfileStore } from "../../store/useProfileStore";

const env = import.meta.env;

export const FamilyGroupForm = ({ setIsStepValid, activeStep, stepIndex }) => {
  // Get user, profile (existing data), loading state, and allFamilyGroups for suggestions
  const {
    error,
    loading,
    allFamilyGroups,
    fetchAllFamilyGroups,
    familyGroup,
    fetchFamilyGroup,
  } = useFamilyStore();
  const { user } = useAuthStore();
  const { profiles, fetchAllUserProfiles, profile } = useProfileStore();

  console.log("profiles 1", profiles);

  // State for autocomplete suggestions for family last name
  const [familySuggestions, setFamilySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState([]); // <-- Add this new state
  const [isCreatingNewGroupWithSameName, setIsCreatingNewGroupWithSameName] =
    useState(false);

  const autocompleteContainerRef = useRef(null);

  useEffect(() => {
    if (user?.id) {
      console.log("Fetching family groups and profiles...");
      fetchAllFamilyGroups();
    }
    return;
  }, [user]);

  useEffect(() => {
    useProfileStore.getState().fetchAllUserProfiles();
  }, []);

  useEffect(() => {
    if (profile && profile?.family_id) {
      fetchFamilyGroup(profile.family_id);
      fetchAllUserProfiles();
    }
    return;
  }, [profile]);

  console.log("profilescall", profiles);
  console.log("famkily", familyGroup);

  const {
    register,
    handleSubmit: handleFamily,
    control,
    setValue,
    watch,
    reset, // Use reset to pre-fill the form
    formState: { errors, isSubmitting, isDirty, isValid },
  } = useForm({
    defaultValues: {
      family_last_name: familyGroup?.family_last_name || "",
      address: familyGroup?.address || "",
      food_allergies: familyGroup?.food_allergies || "",
      house_rules: "",
    },
    mode: "onChange",
  });

  useEffect(() => {
    if (activeStep === stepIndex && setIsStepValid) {
      setIsStepValid(isValid);
    }
  }, [isValid, activeStep, stepIndex, setIsStepValid]);

  // Watch the family_last_name input field for filtering suggestions
  const familyLastNameValue = watch("family_last_name");
  const familyLastName = watch("family_last_name");

  // Effect to pre-fill the form with existing profile data
  useEffect(() => {
    if (familyGroup) {
      reset({
        family_last_name: familyGroup.family_last_name || "",
        address: familyGroup.address || "",
        food_allergies: familyGroup.food_allergies || "",
        house_rules: familyGroup.house_rules || "",
      });
    }
  }, [familyGroup, reset]);

  // Extract unique family names from allFamilyGroups for suggestions
  const familySuggestionsWithMembers = useMemo(() => {
    if (!allFamilyGroups || !profiles) return [];

    return allFamilyGroups
      .filter((group) => group.family_last_name) // filter out empty names
      .map((group) => {
        const members = profiles
          .filter((p) => p.family_id === group.id)
          .map((p) => p.name);

        return {
          id: group.id,
          family_last_name: group.family_last_name,
          members,
        };
      });
  }, [allFamilyGroups, profiles]);
  // Effect to filter family name suggestions as the user types
  useEffect(() => {
    const input = familyLastNameValue?.toLowerCase() || "";

    if (input.length > 0) {
      const filtered = familySuggestionsWithMembers.filter((group) =>
        group.family_last_name.toLowerCase().includes(input)
      );

      const exactMatch = familySuggestionsWithMembers.find(
        (group) =>
          group.family_last_name.toLowerCase() === input &&
          group.id !== profile?.family_id // exclude current group
      );

      const suggestions = [
        ...filtered,
        ...(exactMatch
          ? [
              {
                family_last_name: `A different ${familyLastNameValue} family`,
                members: [],
              },
            ]
          : []),
      ];

      setFamilySuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setFamilySuggestions([]);
      setShowSuggestions(false);
    }
  }, [familyLastNameValue, familySuggestionsWithMembers, profile?.family_id]);

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
  const handleSelectSuggestion = useCallback(
    (suggestion) => {
      const isDifferentFamily = suggestion.startsWith("A different");

      if (isDifferentFamily) {
        reset({
          family_last_name: familyLastNameValue,
          address: "",
          food_allergies: "",
          house_rules: "",
        });
        setSelectedFamilyMembers([]);
        setIsCreatingNewGroupWithSameName(true);
      } else {
        const selectedFamily = allFamilyGroups.find(
          (group) => group.family_last_name === suggestion
        );

        if (selectedFamily) {
          const familyMembers = profiles
            .filter((p) => p.family_id === selectedFamily.id)
            .map((p) => p.name);

          reset({
            family_last_name: selectedFamily.family_last_name,
            address: selectedFamily.address || "",
            food_allergies: selectedFamily.food_allergies || "",
            house_rules: selectedFamily.house_rules || "",
          });

          setSelectedFamilyMembers(familyMembers);
          setIsCreatingNewGroupWithSameName(false);
        }
      }

      setShowSuggestions(false);
    },
    [allFamilyGroups, profiles, reset, familyLastNameValue]
  );

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

    const familyData = {
      family_last_name: data.family_last_name,
      address: data.address,
      food_allergies: data.food_allergies,
      house_rules: data.house_rules,
      // Optionally: isOnboarded: true
    };

    try {
      let familyId;
      let error;

      const isSameName =
        familyGroup?.family_last_name === data.family_last_name;

      if (isSameName && !isCreatingNewGroupWithSameName) {
        // ✅ Update existing group
        const { data: updatedData, error: updateError } = await supabase
          .from("family_groups")
          .update(familyData)
          .eq("id", familyGroup.id)
          .select();

        familyId = updatedData?.[0]?.id || null;
        error = updateError;
      } else {
        // ✅ Create new group—even if name matches
        const { data: insertedData, error: insertError } = await supabase
          .from("family_groups")
          .insert(familyData)
          .select();

        familyId = insertedData?.[0]?.id || null;
        error = insertError;
      }

      if (error) {
        console.error("Supabase error:", error.message, error.code);

        if (error.code === "23505") {
          toast.error(
            "Error: This family group name already exists. Please choose another or select from suggestions."
          );
        } else {
          toast.error("Error updating profile: " + error.message);
        }
        return;
      }

      toast.success(
        isSameName && !isCreatingNewGroupWithSameName
          ? "Family group updated successfully!"
          : "New family group created! 🕎"
      );

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert({ id: user.id, family_id: familyId });

      if (profileError) {
        toast.error("Error updating user profile");
      }

      useProfileStore.getState().fetchAndSetUserProfile(user.id);
    } catch (error) {
      console.error("Unexpected error:", error);
      toast.error("An unexpected error occurred while updating profile.");
    }
  };

  // Show loading state from the store while auth or profile is being fetched
  if (loading) {
    return (
      <Card className="flex flex-col items-center p-8 rounded-lg shadow-lg bg-white">
        <Typography variant="h5" color="blue-gray">
          <Spinner />
        </Typography>
      </Card>
    );
  }

  // If user is not logged in (should be caught by ProtectedRoute, but good fallback)
  if (!user) {
    return (
      <Card className="flex flex-col items-center p-8 rounded-lg shadow-lg bg-white">
        <Typography variant="h5" color="red">
          You must be logged in to view your profile.
        </Typography>
      </Card>
    );
  }

  if (!profile) {
    return "Profile needs to be created before entering hosting details";
  }

  return (
    <>
      <Typography
        variant="h4"
        color="blue-gray"
        className="text-center pt-6 pb-6"
      >
        Host details
      </Typography>
      <Typography color="gray" className="mt-1 font-normal">
        Update your details below.
      </Typography>
      <form className="mt-8 mb-2 w-80" onSubmit={handleFamily(onSubmit)}>
        <div className="mb-1 flex flex-col gap-6">
          <Typography variant="h6" color="blue-gray" className="-mb-3">
            Family Last Name
          </Typography>

          <div className="relative" ref={autocompleteContainerRef}>
            <Input
              size="lg"
              placeholder="Type family last name"
              className="!border-t-blue-gray-200 focus:!border-t-gray-900"
              labelProps={{
                className: "before:content-none after:content-none",
              }}
              {...register("family_last_name", {
                required: "Family Last Name is required",
                validate: validateFamilyName,
              })}
              onFocus={() => {
                if (familyLastNameValue && familyLastNameValue.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 100)}
            />

            {errors.family_last_name && (
              <Typography color="red" variant="small">
                {errors.family_last_name.message}
              </Typography>
            )}
            {showSuggestions && familySuggestions.length > 0 && (
              <ul className="absolute z-10 bg-white border border-gray-300 rounded-md shadow-md mt-2 w-full max-h-60 overflow-y-auto">
                {familySuggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    onClick={() =>
                      handleSelectSuggestion(suggestion.family_last_name)
                    }
                    className="px-4 py-2 hover:bg-gray-100 cursor-pointer"
                  >
                    <strong>{suggestion.family_last_name}</strong>
                    {suggestion.members && suggestion.members.length > 0 && (
                      <p className="text-xs text-gray-500">
                        Members: {suggestion.members.join(", ")}
                      </p>
                    )}
                    {suggestion.family_last_name ===
                      profile?.family_last_name && (
                      <span className="text-xs text-blue-500 ml-2">
                        (Your current group)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {selectedFamilyMembers && (
              <div className="flex flex-col gap-4 m-2">
                Current members of family:
                <div className="flex gap-4">
                  {selectedFamilyMembers.map((m) => (
                    <Chip value={m} variant="chip ghost" />
                  ))}
                </div>
              </div>
            )}
            {isCreatingNewGroupWithSameName && (
              <p className="text-sm text-gray-500 mt-1">
                You’re creating a new family group with the same last name.
              </p>
            )}
          </div>

          {familySuggestions.id === profile?.family_id && (
            <span className="text-xs text-blue-500 ml-2">
              (Your current group)
            </span>
          )}

          <Typography variant="h6" color="blue-gray" className="-mb-3">
            Home Address
          </Typography>
          <Controller
            name="address"
            control={control}
            rules={{ required: "Home Address is required" }}
            render={({ field }) => (
              <Autocomplete
                apiKey={env.VITE_ADDRESS_VALIDATION}
                value={field.value}
                onPlaceSelected={(place) => {
                  field.onChange(place.formatted_address || "");
                  console.log("Place selected:", place);
                }}
                onChange={(e) => {
                  field.onChange(e.target.value);
                }}
                options={{
                  types: ["address"],
                  componentRestrictions: { country: "us" },
                }}
                className="peer w-full h-full bg-transparent text-blue-gray-700 font-sans font-normal outline outline-0 focus:outline-0 disabled:bg-blue-gray-50 disabled:border-0 transition-all placeholder-shown:border placeholder-shown:border-blue-gray-200 placeholder-shown:border-t-blue-gray-200 border focus:border-2 border-t border-t-transparent focus:border-t-transparent text-sm px-3 py-2.5 rounded-[7px] border-blue-gray-200 focus:border-gray-900"
                placeholder="Enter your home address"
              />
            )}
          />
          {errors.address && (
            <Typography color="red" variant="small">
              {errors.address.message}
            </Typography>
          )}

          <Typography variant="h6" color="blue-gray" className="-mb-3">
            Food Allergies
          </Typography>
          <Textarea
            size="lg"
            placeholder="e.g., Peanuts, Gluten"
            className="!border-t-blue-gray-200 focus:!border-t-gray-900"
            labelProps={{
              className: "before:content-none after:content-none",
            }}
            {...register("food_allergies")}
          />

          <Typography variant="h6" color="blue-gray" className="-mb-3">
            House Rules
          </Typography>
          <Textarea
            size="lg"
            placeholder="e.g., No shoes"
            className="!border-t-blue-gray-200 focus:!border-t-gray-900"
            labelProps={{
              className: "before:content-none after:content-none",
            }}
            {...register("house_rules")}
          />
        </div>

        <Button
          className="mt-6"
          fullWidth
          type="submit"
          disabled={isSubmitting || !isDirty}
        >
          {isSubmitting
            ? "Saving..."
            : "Create Family Group" || familyGroup
              ? "Update Host Details"
              : "Create Family Group"}
        </Button>
      </form>
    </>
  );
};
