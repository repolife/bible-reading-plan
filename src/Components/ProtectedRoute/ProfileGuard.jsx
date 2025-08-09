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
    if (!user) return;
    useProfileStore.getState().fetchAndSetUserProfile(user.id);
  }, [user]);

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
              await useProfileStore
                .getState()
                .fetchAndSetUserProfile(newUser.id);
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
      setProfileLoaded(true);
    }
  }, [profile, user]);

  useEffect(() => {
    if (authLoading || profileLoading || userLoading || !user) return;

    if (
      !profile &&
      isAuthenticated &&
      !profileLoading &&
      location.pathname !== "/profile"
    ) {
      console.log("guardsssssssssss");

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
