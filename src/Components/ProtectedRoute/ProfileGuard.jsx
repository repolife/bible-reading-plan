import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/supabaseClient";
import { useAuthStore } from "@store/useAuthStore";
import { useProfileStore } from "@store/useProfileStore";
import { Spinner } from "@material-tailwind/react";

export const ProfileGuard = () => {
  const [profileLoaded, setProfileLoaded] = useState(false);

  const { loading: authLoading, isAuthenticated } = useAuthStore();
  const {
    profile,
    loading: profileLoading,
    fetchAndSetUserProfile,
  } = useProfileStore();

  const { user, userError, loading: userLoading } = useAuthStore();

  console.log("user", user);

  const navigate = useNavigate();

  useEffect(() => {
    if (!user?.id) return;
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
      setProfileLoaded(true);
    }
  }, [profile, user]);

  useEffect(() => {
    if (authLoading || profileLoading || !profileLoaded) return;

    const alreadyOnProfileRoute = location.pathname === "/profile";

    if (!profile && isAuthenticated && !alreadyOnProfileRoute) {
      navigate("/profile");
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
    return <Spinner />;
  }

  return null;
};
