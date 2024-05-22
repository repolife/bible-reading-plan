import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { createHashRouter, RouterProvider } from "react-router-dom";
import FilteredReadingPlan from "./FilteredReadingPlan.jsx";
import { SongList } from "./Songs/SongList.jsx";
import { Song } from "./Songs/Song.jsx";

const router = createHashRouter([
  { path: "/", element: <FilteredReadingPlan /> },
  {
    path: "songs",
    element: <SongList />,
  },
  {
    path: "songs/:songId",
    element: <Song />,
  },
]);

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>
);
