import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import FilteredReadingPlan from "components/ReadingPlan/FilteredReadingPlan/FilteredReadingPlan.jsx";
import { SongList } from "components/Songs/SongList.jsx";
import { Song } from "components/Songs/Song.jsx";
import ReadingTable from "./Components/Songs/Bible-Reading-Plan/ReadingTable.jsx";
import { Verse } from "components/Study/Verse.jsx";
import { Bible } from "components/Bible/Bible.jsx";
import { QueryClient, QueryClientProvider } from "react-query";
import { Calendar } from "./Components/Calendar/Calendar.jsx";
import { ProtectedRoute } from "./Components/ProtectedRoute/ProtectedRoute.jsx";
import { Nav } from "./Components/Shared/Nav/Nav.jsx";
import { useAuthStore } from "@store/useAuthStore";
import { Outlet } from "react-router-dom";
import Layout from "shared/Layout/Layout";
import { AccountProfile } from "./Components/Profile/AccountProfile.jsx";
import { Login } from "./Components/auth/Login.jsx";
import { ToastContainer } from "react-toastify";
import { ProfileGuard } from "./Components/ProtectedRoute/ProfileGuard.jsx";
import * as Sentry from "@sentry/react";
import { Signup } from "@/Components/auth/Signup";
import { StepForm } from "./Components/Form/StepForm.jsx";
import { useProfileStore } from "./store/useProfileStore.js";
import { Account } from "./Components/Account/Account.jsx";
import { ThemeProvider } from "./Components/ThemeProvider/ThemeProvider.jsx";
import GlobalErrorBoundary from "./Components/ErrorBoundary/GlobalErrorBoundary.jsx";
import TestErrorBoundary from "./Components/ErrorBoundary/TestErrorBoundary.jsx";

// Initialize auth listener properly
(async () => {
  try {
    await useAuthStore.getState().initAuthListener();
  } catch (error) {
    console.error('Failed to initialize auth listener:', error);
  }
})();

const env = import.meta.env;

Sentry.init({
  dsn: env.VITE_SENTRY_AUTH_TOKEN,
  sendDefaultPii: true,
});

const RootLayout = () => {
  return (
    <Layout>
      <Nav />
      {/* <ProfileGuard /> */}
      <ToastContainer />
      <Outlet />
    </Layout>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <FilteredReadingPlan />,
      },
      {
        path: "songs",
        element: <SongList />,
      },
      {
        path: "songs/:songId",
        element: <Song />,
      },
      {
        path: "plan",
        element: <ReadingTable />,
      },
      {
        path: "study",
        element: <Bible />,
      },
      {
        path: "login",
        element: <Login />,
      },
      {
        path: "signup",
        element: <Signup />,
      },
      {
        path: "account",
        element: (
          <ProtectedRoute>
            <Account />
          </ProtectedRoute>
        ),
      },
      {
        path: "calendar",
        element: (
          <ProtectedRoute>
            <Calendar />
          </ProtectedRoute>
        ),
      },
      {
        path: "profile",
        element: (
          <ProtectedRoute>
            <StepForm />
          </ProtectedRoute>
        ),
      },
      {
        path: "test-error-boundary",
        element: <TestErrorBoundary />,
      },
    ],
  },

  { path: "study/:book/:chapter/:verse", element: <Verse /> },
]);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <GlobalErrorBoundary>
          <RouterProvider router={router} />
        </GlobalErrorBoundary>
      </QueryClientProvider>
    </ThemeProvider>
  </React.StrictMode>
);
