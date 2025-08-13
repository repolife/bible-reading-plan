import { useEffect } from "react"; // Keep useEffect if needed for other things, but not for auth listener here
import { useAuthStore } from "@store/useAuthStore";
import { Loader } from "../Shared/Loader";
import { useNavigate, useLocation } from "react-router-dom";
import { useProfileStore } from "@store/useProfileStore";

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading, user } = useAuthStore();
  const { profile, loading: profileLoading } = useProfileStore();

  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user) return;
    useProfileStore.getState().fetchAndSetUserProfile(user.id);
  }, [user]);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
  }, [isAuthenticated, loading, navigate, profileLoading]);

  if (loading) {
    return <Loader />;
  }

  return children;
};
