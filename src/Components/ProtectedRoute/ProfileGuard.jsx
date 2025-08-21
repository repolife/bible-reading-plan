import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuthStore } from "@store/useAuthStore";
import { useProfileStore } from "@store/useProfileStore";
import { Spinner } from "../Shared/Spinner/Spinner";

export const ProfileGuard = () => {
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [isProcessingMagicLink, setIsProcessingMagicLink] = useState(false);
  const [loadingTimeout, setLoadingTimeout] = useState(false);

  const { loading: authLoading, isAuthenticated } = useAuthStore();
  const {
    profile,
    loading: profileLoading,
    fetchAndSetUserProfile,
  } = useProfileStore();

  const { user, userError, loading: userLoading } = useAuthStore();

  const navigate = useNavigate();

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (authLoading || profileLoading) {
        console.warn('ProfileGuard: Loading timeout reached, forcing continue');
        setLoadingTimeout(true);
      }
    }, 5000); // Reduced from 10 seconds to 5 seconds

    return () => clearTimeout(timeout);
  }, [authLoading, profileLoading]);

  // Add more aggressive timeout for overall loading
  useEffect(() => {
    const aggressiveTimeout = setTimeout(() => {
      if (authLoading || profileLoading) {
        console.warn('ProfileGuard: Aggressive timeout reached, forcing continue');
        setProfileLoaded(true);
        setLoadingTimeout(true);
      }
    }, 8000); // 8 second aggressive timeout

    return () => clearTimeout(aggressiveTimeout);
  }, [authLoading, profileLoading]);

  // Add fallback for auth store issues
  useEffect(() => {
    const fallbackTimeout = setTimeout(() => {
      if (!user && !authLoading && !profileLoading) {
        console.warn('ProfileGuard: No user after timeout, forcing continue');
        setProfileLoaded(true);
      }
    }, 3000); // Reduced from 5 seconds to 3 seconds

    return () => clearTimeout(fallbackTimeout);
  }, [user, authLoading, profileLoading]);

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

      if (accessToken && refreshToken && !isProcessingMagicLink) {
        console.log('ProfileGuard: Processing magic link...');
        setIsProcessingMagicLink(true);
        
        try {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (sessionError) {
            console.error("Failed to set session:", sessionError.message);
            setIsProcessingMagicLink(false);
            return;
          }

          // Wait for user to hydrate with a timeout
          let attempts = 0;
          const maxAttempts = 15; // Reduced from 20 to 15
          
          const checkUser = async () => {
            const currentUser = useAuthStore.getState().user;
            if (currentUser) {
              console.log('ProfileGuard: User hydrated from magic link:', currentUser.id);
              await fetchAndSetUserProfile(currentUser.id);
              setProfileLoaded(true);
              window.history.replaceState(null, "", location.pathname);
              setIsProcessingMagicLink(false);
            } else if (attempts < maxAttempts) {
              attempts++;
              setTimeout(checkUser, 250); // Reduced from 300ms to 250ms
            } else {
              console.error('ProfileGuard: Magic link user hydration timeout');
              setIsProcessingMagicLink(false);
              // Force continue after timeout
              setProfileLoaded(true);
            }
          };
          
          checkUser();
        } catch (error) {
          console.error('ProfileGuard: Magic link processing error:', error);
          setIsProcessingMagicLink(false);
        }
      }
    };

    rehydrateFromMagicLink();
  }, [location.pathname, fetchAndSetUserProfile, isProcessingMagicLink]);

  useEffect(() => {
    if (profile && user && !isProcessingMagicLink) {
      console.log('ProfileGuard: Profile loaded:', { profileId: profile.id, hasPassword: profile.has_password });
      setProfileLoaded(true);
    }
  }, [profile, user, isProcessingMagicLink]);

  useEffect(() => {
    // Allow continuation if timeout is reached
    if (loadingTimeout) {
      console.log('ProfileGuard: Continuing due to timeout');
      setProfileLoaded(true);
      return;
    }

    if (authLoading || profileLoading || !profileLoaded || isProcessingMagicLink) {
      console.log('ProfileGuard: Still loading:', { 
        authLoading, 
        profileLoading, 
        profileLoaded, 
        isProcessingMagicLink,
        loadingTimeout
      });
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
    isProcessingMagicLink,
    loadingTimeout,
  ]);

 
  // Show loading spinner only when actually loading and not processing magic link
  if (profileLoading && !isProcessingMagicLink && !loadingTimeout) {
    return <Spinner size="md" text="Loading profile..." fullScreen={true} />;
  }

  // Show magic link processing spinner
  if (isProcessingMagicLink) {
    return <Spinner size="md" text="Setting up your session..." fullScreen={true} />;
  }

  return null;
};
