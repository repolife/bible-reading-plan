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

const router = createBrowserRouter([
  { path: "/", element: <FilteredReadingPlan /> },
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

  { path: "study/:book/:chapter/:verse", element: <Verse /> },
]);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>,
);
