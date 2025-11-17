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
import { useMemo } from "react";
import { Chip } from "@material-tailwind/react";
import { useProfileStore } from "../../store/useProfileStore";
import { Spinner } from "../Shared/Spinner/Spinner";
import { ErrorBoundary } from "../ErrorBoundary";

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
          group.family_last_name.toLowerCase() === input
      );

      const suggestions = [
        ...filtered,
        // Always show the "Create NEW" option when there's an exact match
        ...(exactMatch
          ? [
              {
                family_last_name: `⚠️ Create NEW "${familyLastNameValue}" Family Group`,
                members: [],
                isNewGroup: true,
                existingFamilyId: exactMatch.id,
              },
            ]
          : []),
      ];

      setFamilySuggestions(suggestions);
      setShowSuggestions(true);

      // Debug logging
      console.log("Family name input:", input);
      console.log("Exact match found:", exactMatch);
      console.log("Suggestions:", suggestions);
      console.log("Is creating new with same name:", isCreatingNewGroupWithSameName);

      // Check if this is a completely new family name (not in suggestions)
      const isCompletelyNewFamily = isNewFamilyName(input);

      // If it's a new family name, clear other fields and reset state
      if (isCompletelyNewFamily) {
        setValue("address", "");
        setValue("food_allergies", "");
        setValue("house_rules", "");
        setSelectedFamilyMembers([]);
        setIsCreatingNewGroupWithSameName(false);
      }
    } else {
      setFamilySuggestions([]);
      setShowSuggestions(false);
    }
  }, [familyLastNameValue, familySuggestionsWithMembers, profile?.family_id, setValue]);

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
      const isDifferentFamily = suggestion.startsWith("⚠️ Create NEW");

      if (isDifferentFamily) {
        // User wants to create a new family with the same name
        reset({
          family_last_name: familyLastNameValue,
          address: "",
          food_allergies: "",
          house_rules: "",
        });
        setSelectedFamilyMembers([]);
        setIsCreatingNewGroupWithSameName(true);
        
        // Clear any existing family group data since we're creating new
        useFamilyStore.getState().familyGroup = null;
      } else {
        // User selected an existing family
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

  // Helper function to check if current input is a new family name
  const isNewFamilyName = (inputValue) => {
    if (!inputValue) return false;
    return !familySuggestionsWithMembers.some(
      (group) => group.family_last_name.toLowerCase() === inputValue.toLowerCase()
    );
  };

  // Helper function to find existing family by name
  const findExistingFamily = (familyName) => {
    return familySuggestionsWithMembers.find(
      (group) => group.family_last_name.toLowerCase() === familyName.toLowerCase()
    );
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
      <div className="flex items-center justify-center min-h-[400px] w-full">
        <Card className="flex flex-col items-center justify-center p-8 rounded-lg shadow-lg bg-neutral-50 dark:bg-neutral-800">
          <Spinner size="md" text="Loading..." />
        </Card>
      </div>
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
    <div className={`${
      isCreatingNewGroupWithSameName 
        ? "bg-amber-50/30 dark:bg-amber-900/10 rounded-xl p-3 sm:p-6 border border-amber-200 dark:border-amber-700" 
        : ""
    }`}>
      
      {isCreatingNewGroupWithSameName && (
        <div className="bg-amber-100 dark:bg-amber-800/40 border-2 border-amber-300 dark:border-amber-600 rounded-lg p-4 mb-6 text-center">
          <p className="text-amber-900 dark:text-amber-100 font-bold text-lg">
            🚨 ATTENTION: Creating NEW Family Group
          </p>
          <p className="text-amber-800 dark:text-amber-200 text-sm mt-2">
            You are about to create a <strong>COMPLETELY NEW</strong> family group with the last name "{familyLastNameValue}". 
            This will have a different ID and be completely separate from any existing family with the same name.
          </p>
          {findExistingFamily(familyLastNameValue) && (
            <p className="text-amber-700 dark:text-amber-300 text-xs mt-2 italic">
              Note: There is already a family with this name (ID: {
                findExistingFamily(familyLastNameValue)?.id
              })
            </p>
          )}
        </div>
      )}
      
      <Typography
        variant="h4"
        color="primary"
        className={`text-center pt-6 pb-6 ${
          isCreatingNewGroupWithSameName ? "text-amber-600 dark:text-amber-400" : ""
        }`}
      >
        {isCreatingNewGroupWithSameName ? "⚠️ NEW Family Group Setup" : "Host details"}
      </Typography>
      <Typography color="primary" className="mt-1 font-normal">
        {isCreatingNewGroupWithSameName 
          ? "You're creating a NEW family group with the same last name. This will be completely separate from the existing family."
          : "Update your details below."
        }
      </Typography>
      
      {isCreatingNewGroupWithSameName && (
        <div className="w-full h-px bg-amber-300 dark:bg-amber-600 my-6"></div>
      )}
      <form className="mt-8 mb-2 w-full" onSubmit={handleFamily(onSubmit)}>
        <div className="mb-1 flex flex-col gap-6">
          <Typography variant="h6" color="primary" className="-mb-3">
            Family Last Name
          </Typography>

          <div className="relative" ref={autocompleteContainerRef}>
            <Input
              size="lg"
              placeholder="Type family last name"
              className="!border-t-neutral-300 dark:!border-t-neutral-600 focus:!border-t-brand-primary !text-neutral-900 dark:!text-neutral-100 !bg-neutral-50 dark:!bg-neutral-800"
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
              <ul className="absolute z-10 bg-neutral-100 dark:bg-neutral-800 border border-neutral-300 dark:border-neutral-600 rounded-md shadow-md mt-2 w-full max-h-60 overflow-y-auto">
                {familySuggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    onClick={() =>
                      handleSelectSuggestion(suggestion.family_last_name)
                    }
                    className="px-4 py-2 hover:bg-neutral-200 dark:hover:bg-neutral-700 cursor-pointer text-neutral-900 dark:text-neutral-100"
                  >
                    <strong className="text-neutral-900 dark:text-neutral-100">{suggestion.family_last_name}</strong>
                    {suggestion.members && suggestion.members.length > 0 && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                        Members: {suggestion.members.join(", ")}
                      </p>
                    )}
                    {suggestion.family_last_name ===
                      profile?.family_last_name && (
                      <span className="text-xs text-brand-primary ml-2">
                        (Your current group)
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}

            {selectedFamilyMembers && !isCreatingNewGroupWithSameName && !isNewFamilyName(familyLastNameValue) && (
              <div className="flex flex-col gap-4 m-2">
                <div className="text-neutral-700 dark:text-neutral-300 font-medium">
                  Current members of this family:
                </div>
                <div className="flex items-end gap-4">
                  {selectedFamilyMembers.map((m) => (
                    <Chip  color="primary" size="sm" key={m} value={m}><Chip.Label>{m}</Chip.Label></Chip>
                  ))}
                </div>
                
                {/* Check if user is already part of this family */}
                {profile?.family_id === allFamilyGroups.find(
                  (group) => group.family_last_name === familyLastNameValue
                )?.id ? (
                  <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-700 rounded-lg p-3 text-center">
                    <p className="text-green-700 dark:text-green-300 text-sm font-medium">
                      ✅ You are already part of this family group
                    </p>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        // Update the user's profile to link them to this family
                        const { error } = await supabase
                          .from("profiles")
                          .upsert({ 
                            id: user.id, 
                            family_id: allFamilyGroups.find(
                              (group) => group.family_last_name === familyLastNameValue
                            )?.id 
                          });

                        if (error) {
                          toast.error("Error adding you to this family: " + error.message);
                          return;
                        }

                        toast.success("✅ You've been added to this family group!");
                        
                        // Refresh the profile data
                        useProfileStore.getState().fetchAndSetUserProfile(user.id);
                        
                        // Update the local state to show the user is now part of this family
                        setSelectedFamilyMembers(prev => [...prev, user.email || 'You']);
                      } catch (error) {
                        console.error("Error adding user to family:", error);
                        toast.error("An unexpected error occurred while adding you to this family.");
                      }
                    }}
                    className="bg-primaryhover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors text-sm"
                  >
                    ➕ Add Myself to This Family
                  </button>
                )}
              </div>
            )}
            {isCreatingNewGroupWithSameName && (
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg p-4 mt-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                  <div>
                    <p className="text-amber-800 dark:text-amber-200 font-semibold text-sm">
                      ⚠️ Creating New Family Group
                    </p>
                    <p className="text-amber-700 dark:text-amber-300 text-sm mt-1">
                      You're creating a <strong>NEW</strong> family group with the same last name "{familyLastNameValue}". 
                      This will have a different ID and be completely separate from the existing family.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {/* Show indicator for completely new family names */}
            {familyLastNameValue && 
             isNewFamilyName(familyLastNameValue) && 
             !isCreatingNewGroupWithSameName && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4 mt-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">✨</span>
                  </div>
                  <div>
                    <p className="text-blue-800 dark:text-blue-200 font-semibold text-sm">
                      ✨ Creating Completely New Family
                    </p>
                    <p className="text-blue-700 dark:text-blue-300 text-sm mt-1">
                      This is a brand new family name that doesn't exist yet.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {familySuggestions.id === profile?.family_id && (
            <span className="text-xs text-brand-primary ml-2">
              (Your current group)
            </span>
          )}

          <Typography variant="h6" color="primary" className="-mb-3">
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
                className="peer w-full h-full bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 font-sans font-normal outline outline-0 focus:outline-0 disabled:bg-neutral-100 dark:disabled:bg-neutral-700 disabled:border-0 transition-all placeholder-shown:border placeholder-shown:border-neutral-300 dark:placeholder-shown:border-neutral-600 border focus:border-2 border-t border-t-transparent focus:border-t-transparent text-sm px-3 py-2.5 rounded-[7px] focus:border-brand-primary"
                placeholder="Enter your home address"
              />
            )}
          />
          {errors.address && (
            <Typography color="red" variant="small">
              {errors.address.message}
            </Typography>
          )}

          <Typography variant="h6" color="primary" className="-mb-3">
            Food Allergies
          </Typography>
          <Textarea
            size="lg"
            placeholder="e.g., Peanuts, Gluten"
            className="!border-t-neutral-300 dark:!border-t-neutral-600 focus:!border-t-brand-primary !text-neutral-900 dark:!text-neutral-100 !bg-neutral-50 dark:!bg-neutral-800"
            labelProps={{
              className: "before:content-none after:content-none",
            }}
            {...register("food_allergies")}
          />

          <Typography variant="h6" color="primary" className="-mb-3">
            House Rules
          </Typography>
          <Textarea
            size="lg"
            placeholder="e.g., No shoes"
            className="!border-t-neutral-300 dark:!border-t-neutral-600 focus:!border-t-brand-primary !text-neutral-900 dark:!text-neutral-100 !bg-neutral-50 dark:!bg-neutral-800"
            labelProps={{
              className: "before:content-none after:content-none",
            }}
            {...register("house_rules")}
          />
        </div>

        <Button
          className={`mt-6 ${
            isCreatingNewGroupWithSameName 
              ? "bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-500/25" 
              : ""
          }`}
          fullWidth
          type="submit"
          disabled={isSubmitting || !isDirty}
        >
          {isSubmitting
            ? "Saving..."
            : isCreatingNewGroupWithSameName
              ? `⚠️ Create NEW "${familyLastNameValue}" Family Group`
              : familyGroup && !isNewFamilyName(watch("family_last_name"))
                ? "Update Family Group"
                : "Create Family Group"}
        </Button>
      </form>
    </div>
  );
};
