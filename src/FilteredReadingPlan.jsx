import React, { useState, useEffect } from "react";
import readingPlan from "../bible_plan.json";
import axios from "axios";
import ReadingItem from "./ReadingItem";

const FilteredReadingPlan = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]); // Default to today's date

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  console.log(`${import.meta.env.API_KEY}`);
  useEffect(() => {
    axios
      .get("https://api.scripture.api.bible/v1/bibles", { headers: { "api-key": `${import.meta.env.VITE_API_BIBLE}` } })
      .then((res) => console.log(res.data));
  }, []);

  const todayReading = readingPlan.find((entry) => entry.Date === selectedDate);

  return (
    <div>
      <h2>{selectedDate}</h2>
      <h1>Ozark Reading Plan</h1>
      <label htmlFor="date-picker">Select a date: </label>
      <input type="date" id="date-picker" value={selectedDate} onChange={handleDateChange} />
      {todayReading ? (
        <div>
          {todayReading.Passage.split("; ").map((passage, index) => (
            <ReadingItem key={index} passage={passage} />
          ))}
        </div>
      ) : (
        <p>No reading scheduled for this date.</p>
      )}{" "}
    </div>
  );
};

export default FilteredReadingPlan;
