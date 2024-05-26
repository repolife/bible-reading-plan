import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import FilteredReadingPlan from "./FilteredReadingPlan";
import { createClient } from "contentful";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { Fragment } from "react";
import "./App.css";
import { Song } from "./Songs/Song";
import ReadingTable from "./Songs/Bible-Reading-Plan/ReadingTable";

function App() {
  return (
    <Router>
      <Route exact path="/" Component={<FilteredReadingPlan />} />
      <Route exact path="/songs:id" Component={<Song />} />
      <Route exact path="/plan" Component={<ReadingTable />} />
    </Router>
  );
}

export default App;
