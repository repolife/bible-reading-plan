import React, { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import FilteredReadingPlan from "@components/ReadingPlan/FilteredReadingPlan/FilteredReadingPlan.jsx";
import { SongList } from "@components/Songs/SongList.jsx";
import { Song } from "@components/Songs/Song.jsx";
import ReadingTable from "@components/Songs/Bible-Reading-Plan/ReadingTable";
import { Verse } from "@components/Study/Verse.jsx";
import { Bible } from "@components/Bible/Bible.jsx";
import { QueryClient, QueryClientProvider } from "react-query";
import { Calendar } from "@components/Calendar/Calendar.jsx";
import { EventDetailsPage } from "@components/Calendar/EventDetailsPage.jsx";
import { ProtectedRoute } from "@components/ProtectedRoute/ProtectedRoute";
import { Nav } from "@components/Shared/Nav/Nav";
import { useAuthStore } from "@store/useAuthStore";
import { Outlet } from "react-router-dom";
import Layout from "shared/Layout/Layout";
import { AccountProfile } from "@components/Profile/AccountProfile.jsx";
import { Login } from "@components/auth/Login";
import { ToastContainer } from "react-toastify";
import { ProfileGuard } from "@components/ProtectedRoute/ProfileGuard";
import * as Sentry from "@sentry/react";
import { Signup } from "@components/auth/Signup";
import { StepForm } from "@components/Form/StepForm.jsx";
import { useProfileStore } from "./store/useProfileStore";
import { Account } from "@components/Account/Account.jsx";
import { ThemeProvider } from "@components/ThemeProvider/ThemeProvider";
import GlobalErrorBoundary from "@components/ErrorBoundary/GlobalErrorBoundary.jsx";
import TestErrorBoundary from "@components/ErrorBoundary/TestErrorBoundary";


const env = import.meta.env;

Sentry.init({
  dsn: env.VITE_SENTRY_AUTH_TOKEN,
  sendDefaultPii: true,
});

const RootLayout = () => {
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    // Initialize auth listener once when app starts
    useAuthStore.getState().initAuthListener();
  }, []);

  return (
    <Layout>
      <Nav />
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
        path: "events/:eventId",
        element: (
          <ProtectedRoute>
            <EventDetailsPage />
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
