import { Navigate } from "react-router-dom";
import { supabase } from "../../supabaseClient";
import React from "react";

const ProtectedRoute = ({ children }) => {
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ data: { session } }) => setSession(session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  return session ? children : <Navigate to="/login" replace />;
};
