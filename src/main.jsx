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
import { ThemeProvider } from "@material-tailwind/react";
import { Calendar } from "./Components/Calendar/Calendar.jsx";
import { ProtectedRoute } from "./Components/ProtectedRoute/ProtectedRoute.jsx";
import { Nav } from "./Components/Shared/Nav/Nav.jsx";
import { useAuthStore } from "@store/useAuthStore";
import { Outlet } from "react-router-dom";
import Layout from "shared/Layout/Layout";


useAuthStore.getState().initAuthListener();


const RootLayout = () => {
  return (
    <Layout>
      <Nav />
      <Outlet/>
    </Layout>
  )
}


const router = createBrowserRouter([
  { path: "/", element: <RootLayout />,
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
        path: "calendar",
        element: (
          <ProtectedRoute
          >
            <Calendar />
          </ProtectedRoute>
        ),
      },
    ]
   },
  

  { path: "study/:book/:chapter/:verse", element: <Verse /> },
]);

const theme = {
  badge: {
    colors: {
      info: {
        oackground: "bg-info",
        color: "text-info",
      },
    },
  },
};

const queryClient = new QueryClient();

 

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider value={theme}>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);

