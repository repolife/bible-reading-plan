import { useState, useEffect } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import FilteredReadingPlan from "./FilteredReadingPlan";
import { createClient } from "contentful";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { Nav } from "./Nav";
import { Fragment } from "react";
import "./App.css";
import { Song } from "./Songs/Song";

function App() {
  return (
    <Router>
      <Navbar />
      <Route exact path="/" Component={<FilteredReadingPlan />} />
      <Route exact path="/songs:id" Component={<Song />} />
    </Router>
  );
}

export default App;
