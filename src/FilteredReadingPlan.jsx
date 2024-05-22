import React, { useState, useMemo } from "react";
import readingPlan from "../bible_plan.json";
import axios from "axios";
import ReadingItem from "./ReadingItem";
import Navbar from "./NavBar";

const FilteredReadingPlan = () => {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

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

  const weeklyReadings = useMemo(() => {
    if (readingPlan.lenght <= 0) return [];

    let filteredPlan = [];
    readingPlan.filter((entry) => {
      const entryDate = new Date(entry.date);

      if (entryDate === undefined) {
        console.log("empty", entry);
      }
      if (entryDate >= startOfWeek && entryDate <= endOfWeek) {
        filteredPlan = [...filteredPlan, entry];
      }
    });
    return filteredPlan;
  }, [selectedDate, readingPlan]);

  let dateRange = `${startOfWeek.toLocaleDateString("default", { weekday: "long" })} (${startOfWeek.toLocaleDateString()}) - ${endOfWeek.toLocaleDateString("default", { weekday: "long" })} (${endOfWeek.toLocaleDateString()})`;

  return (
    <div>
      <Navbar />

      <h1>Ozark Reading Plan</h1>
      <label htmlFor="date-picker">Select a date: </label>
      <input type="date" id="date-picker" value={selectedDate} onChange={handleDateChange} />
      <h3>{dateRange}</h3>
      {weeklyReadings && weeklyReadings.length > 0 ? (
        <div>
          {weeklyReadings.map((reading, index) => {
            return (
              reading.passage && (
                <div key={index} style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                  {/* <h3>{new Date(reading.date).toLocaleDateString()}</h3> */}
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
