import React, { useState, useEffect } from "react";
import readingPlan from "../bible_plan.json";
import axios from "axios";
import ReadingItem from "./ReadingItem";
import Navbar from "./NavBar";

const FilteredReadingPlan = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]); // Default to today's date

  const handleDateChange = (event) => {
    setSelectedDate(event.target.value);
  };

  const getStartOfWeek = (date) => {
    const currentDate = new Date(date);
    const day = currentDate.getDay();
    const diff = currentDate.getDate() - day;
    return new Date(currentDate.setDate(diff));
  };

  const getEndOfWeek = (date) => {
    const startOfWeek = getStartOfWeek(date);
    return new Date(startOfWeek.setDate(startOfWeek.getDate() + 6));
  };

  const startOfWeek = getStartOfWeek(selectedDate);
  const endOfWeek = getEndOfWeek(selectedDate);

  const weeklyReadings = readingPlan.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate >= startOfWeek && entryDate <= endOfWeek;
  });

  return (
    <div>
      <Navbar />
      <h2>{new Date(selectedDate).toLocaleDateString()}</h2>
      <h1>Ozark Reading Plan</h1>
      <label htmlFor="date-picker">Select a date: </label>
      <input type="date" id="date-picker" value={selectedDate} onChange={handleDateChange} />
      {weeklyReadings.length > 0 ? (
        <div>
          {weeklyReadings.map((reading, index) => {
            return (
              reading.passage && (
                <div key={index}>
                  <h3>{new Date(reading.date).toLocaleDateString()}</h3>
                  {reading.passage.split("; ").map((passage, i) => (
                    <ReadingItem key={i} passage={passage} />
                  ))}
                </div>
              )
            );
          })}
        </div>
      ) : (
        <p>No readings scheduled for this week.</p>
      )}
    </div>
  );
};

export default FilteredReadingPlan;
