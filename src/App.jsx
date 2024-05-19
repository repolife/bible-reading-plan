import { useState } from "react";
import reactLogo from "./assets/react.svg";
import viteLogo from "/vite.svg";
import "./App.css";
import FilteredReadingPlan from "./FilteredReadingPlan";

function App() {
  const [count, setCount] = useState(0);

  return (
    <>
      <FilteredReadingPlan />
    </>
  );
}

export default App;
