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
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
