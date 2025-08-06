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

export const FamilyGroupForm = () => {
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
  const autocompleteContainerRef = useRef(null);

  useEffect(() => {
    if (user.id) {
      console.log("Fetching family groups and profiles...");
      fetchAllFamilyGroups();
    }
  }, [user]);

  useEffect(() => {
    if (profile && profile.family_id) {
      fetchFamilyGroup(profile.family_id);
      fetchAllUserProfiles();
    }
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
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    defaultValues: {
      family_last_name: familyGroup?.family_last_name || "",
      address: familyGroup?.address || "",
      food_allergies: familyGroup?.food_allergies || "",
      house_rules: "",
    },
    mode: "onChange",
  });

  //    const familyMembers = useMemo(() => {
  //     if(!profiles  && !profile) return
  //     console.log('familySuggestions', familySuggestions)

  //     return profiles.filter(profile => profile.family_id === profile.family_id)
  //    }, [profiles, profile, familySuggestions])

  //    console.log('familyMembers', familyMembers)

  // Watch the family_last_name input field for filtering suggestions
  const familyLastNameValue = watch("family_last_name");

  // Effect to pre-fill the form with existing profile data
  useEffect(() => {
    if (familyGroup) {
      // Format birthday for input type="date" (YYYY-MM-DD)
      reset({
        family_last_name: familyGroup.family_last_name || "",
        address: familyGroup.address || "",
        food_allergies: familyGroup.food_allergies || "",
        house_rules: familyGroup.house_rules || "",
      });
    }
  }, [familyGroup, reset]);

  // Extract unique family names from allFamilyGroups for suggestions
  const uniqueFamilyNames = useCallback(() => {
    if (!allFamilyGroups || allFamilyGroups.length === 0) return [];
    return Array.from(
      new Set(allFamilyGroups.map((p) => p.family_last_name).filter(Boolean))
    );
  }, [allFamilyGroups]);

  // Effect to filter family name suggestions as the user types
  useEffect(() => {
    const currentInput = familyLastNameValue
      ? familyLastNameValue.toLowerCase()
      : "";
    if (currentInput.length > 0) {
      const filtered = uniqueFamilyNames().filter((name) =>
        name.toLowerCase().includes(currentInput)
      );

      console.log("filtered", filtered);
      setFamilySuggestions(filtered);
      setShowSuggestions(true);
    } else {
      setFamilySuggestions([]);
      setShowSuggestions(false);
    }
  }, [familyLastNameValue, uniqueFamilyNames]);

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
    const selectedFamily = allFamilyGroups.find(
      (group) => group.family_last_name === suggestion
    );

    if (selectedFamily) {
      // Find the family members based on the selected family's ID
      const familyMembers = profiles
        .filter((p) => p.family_id === selectedFamily.id)
        .map((p) => p.name);

      console.log(
        "Found family members:",
        familyMembers,
        selectedFamily.id,
        profiles
      );

      // Update the form fields
      reset({
        family_last_name: selectedFamily.family_last_name,
        address: selectedFamily.address || "",
        food_allergies: selectedFamily.food_allergies || "",
        house_rules: selectedFamily.house_rules || "",
      });

      // Update the new state variable with the found family members
      setSelectedFamilyMembers(familyMembers);
    } else {
      // If it's not a suggestion, clear the family members state and set the value
      setValue("family_last_name", suggestion, { shouldValidate: true });
      setSelectedFamilyMembers([]);
    }

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
    debugger;
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
      // You might also set isOnboarded: true here if this is the final onboarding step
      // isOnboarded: true,
    };

    try {
      let familyId;
      let error;

      if (
        familyGroup &&
        familyGroup.family_last_name === data.family_last_name
      ) {
        // If the user is updating an existing family group they belong to
        const { data: updatedData, error: updateError } = await supabase
          .from("family_groups")
          .update(familyData)
          .eq("id", familyGroup.id)
          .select();
        familyId = updatedData ? updatedData[0].id : null;
        error = updateError;
      } else {
        // If creating a new family group or selecting an existing one not currently associated
        ({
          data: [{ id: familyId }],
          error,
        } = await supabase.from("family_groups").insert(familyData).select());
      }

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
            "Error: This family group name already exists. Please choose another or select from suggestions."
          );
        } else {
          toast.success("Error updating profile: " + error.message);
        }
      } else {
        toast.success("Family group was created! 🕎");
        const { error: profileError } = await supabase // eslint-disable-line
          .from("profiles")
          .upsert({ id: user.id, family_id: familyId });

        if (profileError) {
          toast.error("Error updating user profile");
        }

        useProfileStore.getState().fetchAndSetUserProfile(user.id);
      }
    } catch (error) {
      console.error("General error updating profile:", error);
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

            {errors.family_last_name && (
              <Typography color="red" variant="small">
                {errors.family_last_name.message}
              </Typography>
            )}
            {showSuggestions && familySuggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                {familySuggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className="p-2 cursor-pointer hover:bg-gray-100"
                    onMouseDown={() => handleSelectSuggestion(suggestion)}
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>
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
