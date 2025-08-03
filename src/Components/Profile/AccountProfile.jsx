import React, { useMemo, useEffect, useCallback, useRef } from 'react';
import { useForm } from 'react-hook-form';
import {
    Input,
    Button,
    Typography,
    Card
} from "@material-tailwind/react";

import { useAuthStore } from "@store/useAuthStore";
import { supabase } from '@/supabaseClient'; // Corrected Supabase client import path
import {  toast } from 'react-toastify';
import { useFamilyStore } from '@store/useFamilyGroupStore';
import { FamilyGroupForm } from '../Form/FamilyGroupForm';
import { useProfileStore } from '@store/useProfileStore';


export const AccountProfile = () => {
    // Get user, profile (existing data), loading state, and allProfiles for suggestions
    const { user, loading: authLoading,  } = useAuthStore();
    const { profile: existingProfile, loading: profileLoading, allProfiles} = useProfileStore()
    const { fetchFamilyGroup, familyGroup, } = useFamilyStore()



    useEffect(() => {
        if(user.id) {
            fetchFamilyGroup(user.id)
        }
    }, [user?.id])

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
            email_alerts: '',
            name: ''
        },
        mode: 'onChange'
    });


    // Effect to pre-fill the form with existing profile data
    useEffect(() => {
        if (existingProfile) {
            // Format birthday for input type="date" (YYYY-MM-DD)
            const formattedBirthday = existingProfile.birthday ? existingProfile.birthday.split('T')[0] : '';
            reset({
                birthday: formattedBirthday,
                name: existingProfile.name || ''
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

    console.log('all', allProfiles)



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
          
            birthday: data.birthday, // YYYY-MM-DD string
            name: data.name

       
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
                toast.success('Profile updated successfully! 🕎');
                // IMPORTANT: Re-fetch the user's profile in the store to reflect changes
                // This updates the 'profile' state in your Zustand store,
                // ensuring other components get the latest data.
                useProfileStore.getState().fetchAndSetUserProfile(user.id);

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
        <div>
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
                        className="!border-t-blue-gray-200 focus:!border-t-gray-900"
                        labelProps={{
                            className: "before:content-none after:content-none",
                        }}
                    />

                    <Typography variant="h6" color="blue-gray" className="-mb-3">
                        Name
                    </Typography>
                    <Input
                        size="lg"
                        placeholder="name"
                        className="!border-t-blue-gray-200 focus:!border-t-gray-900"
                        labelProps={{
                            className: "before:content-none after:content-none",
                        }}
                        {...register('name')}
                    />
      
                    <Typography variant="h6" color="blue-gray" className="-mb-3">
                        Birthday
                    </Typography>
                    <Input
                    disabled={!familyGroup}
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

                </div>
                {familyGroup &&  <Button className="mt-6" fullWidth type="submit" disabled={isSubmitting || !isDirty}>
                {isSubmitting ? 'Saving...' : 'Update Profile'}
            </Button>}   

            </form>
            {<FamilyGroupForm/>}                      
        </div>
        </Card>
    );
};