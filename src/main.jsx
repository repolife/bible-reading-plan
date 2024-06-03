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
import { Bible } from "./Study/Bible.jsx";
import { QueryClient, QueryClientProvider } from "react-query";

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
  { path: "study/:book/:chapter/:verse", element: <Bible /> },
]);

const queryClient = new QueryClient();

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  </React.StrictMode>
);
