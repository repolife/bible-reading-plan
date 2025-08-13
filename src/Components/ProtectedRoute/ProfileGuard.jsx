import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuthStore } from "@store/useAuthStore";
import { useProfileStore } from "@store/useProfileStore";
import { Spinner } from "../Shared/Spinner/Spinner";

export const ProfileGuard = () => {
  const [profileLoaded, setProfileLoaded] = useState(false);

  const { loading: authLoading, isAuthenticated } = useAuthStore();
  const {
    profile,
    loading: profileLoading,
    fetchAndSetUserProfile,
  } = useProfileStore();

  const { user, userError, loading: userLoading } = useAuthStore();

  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
    console.log('ProfileGuard: Fetching profile for user:', user.id);
    useProfileStore.getState().fetchAndSetUserProfile(user?.id);
  }, [user?.id]);

  useEffect(() => {
    const rehydrateFromMagicLink = async () => {
      const hashParams = new URLSearchParams(window.location.hash.slice(1));
      const accessToken = hashParams.get("access_token");
      const refreshToken = hashParams.get("refresh_token");

      if (accessToken && refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error("Failed to set session:", sessionError.message);
          return;
        }

        // Wait for user to hydrate
        const unsubscribe = useAuthStore.subscribe(
          (state) => state.user,
          async (newUser) => {
            if (newUser) {
              await fetchAndSetUserProfile(newUser.id);
              setProfileLoaded(true);
              window.history.replaceState(null, "", location.pathname);
              unsubscribe(); // Clean up
            }
          }
        );
      }
    };

    rehydrateFromMagicLink();
  }, [location.pathname]);

  useEffect(() => {
    if (profile && user) {
      console.log('ProfileGuard: Profile loaded:', { profileId: profile.id, hasPassword: profile.has_password });
      setProfileLoaded(true);
    }
  }, [profile, user]);

  useEffect(() => {
    if (authLoading || profileLoading || !profileLoaded) {
      console.log('ProfileGuard: Still loading:', { authLoading, profileLoading, profileLoaded });
      return;
    }

    // Check if user is on protected routes that require profile completion
    const protectedRoutes = ['/profile', '/account', '/calendar'];
    const currentRoute = location.pathname;
    const isOnProtectedRoute = protectedRoutes.some(route => currentRoute.startsWith(route));

    console.log('ProfileGuard Debug:', {
      currentRoute,
      hasProfile: !!profile,
      hasPassword: profile?.has_password,
      isAuthenticated,
      profileLoaded,
      profileData: profile
    });

    // If user has no profile at all, redirect to profile setup
    if (!profile && isAuthenticated && currentRoute !== '/profile') {
      console.log('Redirecting to /profile - no profile exists');
      navigate("/profile");
      return;
    }

    // If user has profile but no password, redirect to account page
    if (profile && !profile.has_password && isAuthenticated && currentRoute !== '/account') {
      console.log('Redirecting to /account - profile exists but no password');
      navigate("/account");
      return;
    }

    // If user has profile and password, allow access to all routes
    if (profile && profile.has_password && isAuthenticated) {
      console.log('User fully set up - allowing access');
      // User is fully set up, no redirects needed
      return;
    }
  }, [
    profile,
    authLoading,
    profileLoading,
    profileLoaded,
    location.pathname,
    navigate,
    isAuthenticated,
  ]);

  if (profileLoading) {
    return <Spinner size="md" text="Loading profile..." fullScreen={true} />;
  }

  return null;
};
