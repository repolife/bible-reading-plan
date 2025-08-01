import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useForm, Controller } from 'react-hook-form';
import {
    Input,
    Button,
    Typography,
    Textarea,
    Card
} from "@material-tailwind/react";
import Autocomplete from 'react-google-autocomplete';

import { useAuthStore } from "@store/useAuthStore";
import { supabase } from '@/supabaseClient'; // Corrected Supabase client import path
import {  toast } from 'react-toastify';

const env = import.meta.env;

export const AccountProfile = () => {
    // Get user, profile (existing data), loading state, and allProfiles for suggestions
    const { user, profile: existingProfile, loading: authLoading, allProfiles } = useAuthStore();

    // State for autocomplete suggestions for family last name
    const [familySuggestions, setFamilySuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const autocompleteContainerRef = useRef(null);


    const {
        register,
        handleSubmit,
        control,
        setValue,
        watch,
        reset, // Use reset to pre-fill the form
        formState: { errors, isSubmitting, isDirty }
    } = useForm({
        defaultValues: {
            family_last_name: '',
            address: '',
            birthday: '',
            food_allergies: '',
            house_rules: '',
        },
        mode: 'onChange'
    });

    // Watch the family_last_name input field for filtering suggestions
    const familyLastNameValue = watch("family_last_name");

    // Effect to pre-fill the form with existing profile data
    useEffect(() => {
        if (existingProfile) {
            // Format birthday for input type="date" (YYYY-MM-DD)
            const formattedBirthday = existingProfile.birthday ? existingProfile.birthday.split('T')[0] : '';
            reset({
                family_last_name: existingProfile.family_last_name || '',
                address: existingProfile.address || '',
                birthday: formattedBirthday,
                food_allergies: existingProfile.food_allergies || '',
                house_rules: existingProfile.house_rules || '',
            });
        }
    }, [existingProfile, reset]); // Reset form when existingProfile changes

    // Extract unique family names from allProfiles for suggestions
    const uniqueFamilyNames = useCallback(() => {
        if (!allProfiles || allProfiles.length === 0) return [];
        return Array.from(
            new Set(allProfiles.map(p => p.family_last_name).filter(Boolean))
        );
    }, [allProfiles]);

    // Effect to filter family name suggestions as the user types
    useEffect(() => {
        const currentInput = familyLastNameValue ? familyLastNameValue.toLowerCase() : '';
        if (currentInput.length > 0) {
            const filtered = uniqueFamilyNames().filter(name =>
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
            if (autocompleteContainerRef.current && !autocompleteContainerRef.current.contains(event.target)) {
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
            id: user.id, // Link profile to Supabase auth user ID
            family_last_name: data.family_last_name,
            address: data.address,
            birthday: data.birthday, // YYYY-MM-DD string
            food_allergies: data.food_allergies,
            house_rules: data.house_rules,
            // You might also set isOnboarded: true here if this is the final onboarding step
            // isOnboarded: true,
        };

        try {
            // Use upsert to either insert a new profile or update an existing one
            // based on the 'id' field.
            const { error } = await supabase.from('profiles').upsert(profileData, {
                onConflict: 'id' // Specify 'id' as the conflict target for upsert
            });

            if (error) {
                console.error('Supabase error updating profile:', error.message, error.code);
                // Handle specific Supabase errors, e.g., unique constraint violation
                if (error.code === '23505') { // Common PostgreSQL unique violation error code
                    toast.error('Error: This family last name already exists. Please choose another or select from suggestions.');
                } else {
                    toast.success('Error updating profile: ' + error.message);
                }
            } else {
                toast.success('Profile updated successfully!, Welcome to the cult! 🕎');
                // IMPORTANT: Re-fetch the user's profile in the store to reflect changes
                // This updates the 'profile' state in your Zustand store,
                // ensuring other components get the latest data.
                useAuthStore.getState().fetchAndSetUserProfile(user.id);

            }
        } catch (error) {
            console.error('General error updating profile:', error);
            toast.error('An unexpected error occurred while updating profile.');
        }
    };

    // Show loading state from the store while auth or profile is being fetched
    if (authLoading) {
        return (
            <Card className='flex flex-col items-center p-8 rounded-lg shadow-lg bg-white'>
                <Typography variant="h5" color="blue-gray">Loading User Profile...</Typography>
            </Card>
        );
    }

    // If user is not logged in (should be caught by ProtectedRoute, but good fallback)
    if (!user) {
        return (
            <Card className='flex flex-col items-center p-8 rounded-lg shadow-lg bg-white'>
                <Typography variant="h5" color="red">You must be logged in to view your profile.</Typography>
            </Card>
        );
    }

    return (
        <Card className='flex flex-col items-center p-8 rounded-lg shadow-lg bg-white' shadow={false}>
            <Typography variant="h4" color="blue-gray">
                Your Profile
            </Typography>
            <Typography color="gray" className="mt-1 font-normal">
                Update your details below.
            </Typography>
            <form className="mt-8 mb-2 w-80" onSubmit={handleSubmit(onSubmit)}>
                <div className="mb-1 flex flex-col gap-6">
                    <Typography variant="h6" color="blue-gray" className="-mb-3">
                        Email (Cannot be changed here)
                    </Typography>
                    {/* Display user's email from auth store (read-only) */}
                    <Input
                        size="lg"
                        placeholder="user@example.com"
                        value={user.email || ''}
                        disabled // Make it read-only
                        className="!border-t-blue-gray-200 focus:!border-t-gray-900"
                        labelProps={{
                            className: "before:content-none after:content-none",
                        }}
                    />

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
                                validate: validateFamilyName
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
                                    field.onChange(place.formatted_address || '');
                                    console.log('Place selected:', place);
                                }}
                                onChange={(e) => {
                                    field.onChange(e.target.value);
                                }}
                                options={{
                                    types: ['address'],
                                    componentRestrictions: { country: 'us' },
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
                        Birthday
                    </Typography>
                    <Input
                        type="date"
                        size="lg"
                        placeholder="YYYY-MM-DD"
                        className="!border-t-blue-gray-200 focus:!border-t-gray-900"
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
                                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                                    age--;
                                }
                                return age >= 18 || "You must be at least 18 years old.";
                            }
                        })}
                    />
                    {errors.birthday && (
                        <Typography color="red" variant="small">
                            {errors.birthday.message}
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

                <Button className="mt-6" fullWidth type="submit" disabled={isSubmitting || !isDirty}>
                    {isSubmitting ? 'Saving...' : 'Update Profile'}
                </Button>
            </form>
        </Card>
    );
};