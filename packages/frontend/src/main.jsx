import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import 'react-day-picker/dist/style.css';
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { FilteredReadingPlan } from "@components/ReadingPlan/FilteredReadingPlan/FilteredReadingPlan";
import { SongList } from "@components/Songs/SongList";
import { Song } from "@components/Songs/Song";
import { ReadingTable } from "@components/Songs/Bible-Reading-Plan/ReadingTable";
import { Verse } from "@components/Study/Verse";
import { Bible } from "@components/Bible/Bible";
import { QueryClient, QueryClientProvider } from "react-query";
import { Calendar } from "@components/Calendar/Calendar";
import { EventDetailsPage } from "@components/Calendar/EventDetailsPage";
import { ProtectedRoute } from "@components/ProtectedRoute/ProtectedRoute";
import { Nav } from "@components/Shared/Nav/Nav";
import { useAuthStore } from "@store/useAuthStore";
import { Outlet } from "react-router-dom";
import { Layout } from "shared/Layout/Layout";
import { Login } from "@components/auth/Login";
import { ToastContainer } from "react-toastify";
// import * as Sentry from "@sentry/react";
import { Signup } from "@components/auth/Signup";
import { StepForm } from "@components/Form/StepForm";
import { Account } from "@components/Account/Account";
import { ThemeProvider } from "@components/ThemeProvider/ThemeProvider";
import GlobalErrorBoundary from "@components/ErrorBoundary/GlobalErrorBoundary";
import { TestErrorBoundary } from "@components/ErrorBoundary/TestErrorBoundary";
import "@/utils/pwa"; // Initialize PWA functionality


const env = import.meta.env;

// Sentry initialization removed for debugging

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
    <QueryClientProvider client={queryClient}>
      <GlobalErrorBoundary>
        <RouterProvider router={router} />
      </GlobalErrorBoundary>
    </QueryClientProvider>
  </React.StrictMode>
);
