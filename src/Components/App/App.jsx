import React from "react";
import FilteredReadingPlan from "./FilteredReadingPlan";
import { Song } from "./Songs/Song";
import ReadingTable from "./Songs/Bible-Reading-Plan/ReadingTable";
import { QueryClientProvider, QueryClient } from "react-query";
import { Verse } from "./Study/Verse";
import { Bible } from "../Bible/Bible";
import "../../App.css";

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Route exact path="/" Component={<FilteredReadingPlan />} />
        <Route exact path="/songs:id" Component={<Song />} />
        <Route exact path="/plan" Component={<ReadingTable />} />
        <Route exact path="/study" Component={<Bible />} />
        <Route exact path="/study/:book/:chapter/:verse" Component={<Verse />} />
      </Router>
    </QueryClientProvider>
  );
}

export default App;
