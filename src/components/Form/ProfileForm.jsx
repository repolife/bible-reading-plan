import React, { useState, useEffect, useCallback, useRef } from "react"; // Added useState, useEffect, useCallback, useRef
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
import { Toast } from "../Shared/Layout/Notify/Toast";
import { useProfileStore } from "@store/useProfileStore";

const env = import.meta.env;

export const ProfileForm = () => {
  // Get all profiles and the current user's specific profile/user from your store
  const {
    profiles: allProfiles,
    user,
    profile: existingProfile,
  } = useProfileStore(); // Renamed 'profile' to 'existingProfile' for clarity

  // State for autocomplete suggestions for family last name
  const [familySuggestions, setFamilySuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false); // To control dropdown visibility
  const autocompleteContainerRef = useRef(null); // Ref to manage clicks outside

  const {
    register,
    handleSubmit,
    control,
    setValue, // Use setValue to manually set form field values
    watch, // Use watch to get current input values for debounce
    formState: { errors, isSubmitting },
    reset, // To reset form with default values or existing profile data
  } = useForm({
    defaultValues: {
      family_last_name: "",
      address: "",
      birthday: "", // Added birthday
      food_allergies: "",
      house_rules: "", // Added house_rules
      // Note: Password is typically handled separately for updates, not stored directly in profile
    },
    mode: "onChange",
  });

  // Watch the family_last_name input field for filtering suggestions
  const familyLastNameValue = watch("family_last_name");

  // Populate form with existing profile data when it loads
  useEffect(() => {
    if (existingProfile) {
      reset({
        family_last_name: existingProfile.family_last_name || "",
        address: existingProfile.address || "",
        birthday: existingProfile.birthday
          ? existingProfile.birthday.split("T")[0]
          : "", // Format date for input type="date"
        food_allergies: existingProfile.food_allergies || "",
        house_rules: existingProfile.house_rules || "",
        // Do NOT pre-fill password for security reasons
      });
    }
  }, [existingProfile, reset]);

  // Extract unique family names from allProfiles for suggestions
  const uniqueFamilyNames = useCallback(() => {
    if (!allProfiles || allProfiles.length === 0) return [];
    return Array.from(
      new Set(allProfiles.map((p) => p.family_last_name).filter(Boolean))
    );
  }, [allProfiles]);

  // Effect to filter family name suggestions as the user types
  useEffect(() => {
    const currentInput = familyLastNameValue
      ? familyLastNameValue.toLowerCase()
      : "";
    if (currentInput.length > 0) {
      const filtered = uniqueFamilyNames().filter((name) =>
        name.toLowerCase().includes(currentInput)
      );
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
    setValue("family_last_name", suggestion, { shouldValidate: true }); // Set value in RHF
    setShowSuggestions(false); // Hide suggestions
  };

  // Custom validation for family_last_name (e.g., enforce selection from existing)
  const validateFamilyName = (value) => {
    if (!value) return "Family Last Name is required";

    // If you ONLY want to allow selection from existing names, uncomment this:
    // const existingNames = uniqueFamilyNames();
    // if (!existingNames.some(name => name.toLowerCase() === value.toLowerCase())) {
    //     return "Please select an existing family name from the suggestions.";
    // }

    return true; // Valid if it passes above checks or if new names are allowed
  };

  // 2. Define your onSubmit function
  const onSubmit = async (data) => {
    if (!user || !user.id) {
      console.error("User not logged in or user ID not available.");
      return;
    }

    const profileData = {
      family_last_name: data.family_last_name,
      address: data.address,
      birthday: data.birthday, // YYYY-MM-DD string
      food_allergies: data.food_allergies,
      house_rules: data.house_rules,
      // Add any other fields you want to store in the 'profiles' table
    };

    // You would typically send data to your backend (e.g., Supabase)
    try {
      // Use upsert to either insert a new profile or update an existing one
      // based on the 'id' field.
      const { error } = await supabase.from("profiles").upsert(profileData, {
        onConflict: "id", // Specify 'id' as the conflict target for upsert
      });

      if (error) {
        if (error.code === "23505") {
          // Example: Unique constraint violation code
          toast(
            "Error: This family last name already exists and cannot be used again."
          );
        } else {
          throw error;
        }
      } else {
        toast("Profile updated! 🕎");
        // Optionally, re-fetch the user's profile in the store to reflect changes
        useProfileStore.getState().fetchAndSetUserProfile(user.id);
      }
    } catch (error) {
      console.error("Error updating profile:", error.message);
  
      toast("Error updating profile:" + error.message);
    }
  };

  return (
    <Card
      // className="flex flex-col items-center p-8 rounded-lg shadow-lg bg-white"
      // shadow={false}
    >
      <Typography variant="h4" color="primary">
        Shalom!
      </Typography>
      <Typography color="gray" className="mt-1 font-normal">
        Please enter your details to make hosting easier.
      </Typography>
      {/* 3. Wrap your form with handleSubmit */}
      <form className="mt-8 mb-2" onSubmit={handleSubmit(onSubmit)}>
        <div className="mb-1 flex flex-col gap-6">
          <Typography variant="h6" color="primary" className="-mb-3">
            Family Last Name
          </Typography>
          {/* Custom Autocomplete for Family Last Name */}
          <div className="relative" ref={autocompleteContainerRef}>
            <Input
              size="lg"
              placeholder="Type family last name"
              className="!border-t-primary-200 focus:border-t-gray-900!"
              labelProps={{
                className: "before:content-none after:content-none",
              }}
              {...register("family_last_name", {
                required: "Family Last Name is required",
                validate: validateFamilyName, // Apply the custom validation
              })}
              onFocus={() => {
                // Only show suggestions if there's already input
                if (familyLastNameValue && familyLastNameValue.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 100)} // Small delay to allow click on suggestion
            />
            {errors.family_last_name && (
              <Typography color="red" variant="small">
                {errors.family_last_name.message}
              </Typography>
            )}

            {/* Suggestions Dropdown */}
            {showSuggestions && familySuggestions.length > 0 && (
              <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-md mt-1 max-h-48 overflow-y-auto shadow-lg">
                {familySuggestions.map((suggestion, index) => (
                  <li
                    key={index}
                    className="p-2 cursor-pointer hover:bg-gray-100"
                    onMouseDown={() => handleSelectSuggestion(suggestion)} // Use onMouseDown to prevent onBlur from firing first
                  >
                    {suggestion}
                  </li>
                ))}
              </ul>
            )}
          </div>

          <Typography variant="h6" color="primary" className="-mb-3">
            Home Address
          </Typography>
          {/* Google Autocomplete for Home Address */}
          <Controller
            name="address" // This is the name for react-hook-form
            control={control}
            rules={{ required: "Home Address is required" }} // Add validation rules
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
                className="peer w-full h-full bg-transparent text-primary-700 font-sans font-normal outline outline-0 focus:outline-0 disabled:bg-primary-50 disabled:border-0 transition-all placeholder-shown:border placeholder-shown:border-primary-200 placeholder-shown:border-t-primary-200 border focus:border-2 border-t border-t-transparent focus:border-t-transparent text-sm px-3 py-2.5 rounded-[7px] border-primary-200 focus:border-gray-900"
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
            Birthday
          </Typography>
          <Input
            type="date"
            size="lg"
            placeholder="YYYY-MM-DD"
            className="!border-t-primary-200 focus:border-t-gray-900!"
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
            Food Allergies
          </Typography>
          <Textarea
            size="lg"
            placeholder="e.g., Peanuts, Gluten"
            className="!border-t-primary-200 focus:border-t-gray-900!"
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
            className="!border-t-primary-200 focus:border-t-gray-900!"
            labelProps={{
              className: "before:content-none after:content-none",
            }}
            {...register("house_rules")}
          />
        </div>{" "}
        {/* End of mb-1 flex flex-col gap-6 */}
        <Button
          className="mt-6"
          fullWidth
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Submitting..." : "Save Profile"}
        </Button>
      </form>
      <Toast />
    </Card>
  );
};
