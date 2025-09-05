import { useEffect } from "react"; // Keep useEffect if needed for other things, but not for auth listener here
import { useAuthStore } from "@store/useAuthStore";
import { Loader } from "../Shared/Loader";
import { useNavigate, useLocation } from "react-router-dom";
import { useProfileStore } from "@store/useProfileStore";
import { ProfileGuard } from "./ProfileGuard";

export const ProtectedRoute = ({ children }) => {
  const { isAuthenticated, loading } = useAuthStore();

  const navigate = useNavigate();
  const location = useLocation();



  useEffect(() => {
    if (loading ) return;
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, loading, navigate, , location.pathname]);

  if (loading) {
    return <Loader />;
  }

  return <>
  <ProfileGuard/>
  {children}
  </>;
};
