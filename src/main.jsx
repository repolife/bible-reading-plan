import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import FilteredReadingPlan from "./FilteredReadingPlan.jsx";
import { SongList } from "./Songs/SongList.jsx";
import { Song } from "./Songs/Song.jsx";
import Calendar from "./calendar.jsx";
import ReadingTable from "./Songs/Bible-Reading-Plan/ReadingTable.jsx";
import { Verse } from "./Study/Verse.jsx";
import { Bible } from "./Components/Bible/Bible.jsx";
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
    path: "events",
    element: <Calendar />,
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
        {" "}
        <RouterProvider router={router} />
      </ThemeProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
