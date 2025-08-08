import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuthStore } from "@store/useAuthStore";
import { useProfileStore } from "@store/useProfileStore";

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

        if (userError || !user) {
          console.error("Failed to fetch user:", userError?.message);
          return;
        }

        await fetchAndSetUserProfile(user.id);
        setProfileLoaded(true);

        // Clean up hash from URL
        window.history.replaceState(null, "", location.pathname);
      }
    };

    rehydrateFromMagicLink();
  }, [fetchAndSetUserProfile, location.pathname, user]);

  useEffect(() => {
    if (authLoading || profileLoading || userLoading || !user || !profileLoaded)
      return;

    if (
      profile === null &&
      isAuthenticated &&
      location.pathname !== "/profile"
    ) {
      navigate("/profile");
    }
  }, [
    profile,
    authLoading,
    profileLoading,
    location.pathname,
    navigate,
    isAuthenticated,
    userLoading,
    user,
    profileLoaded,
  ]);

  return null;
};
