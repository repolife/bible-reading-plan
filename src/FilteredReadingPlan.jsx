import React, { useState, useMemo } from "react";
import readingPlan from "../bible_plan.json";
import ReadingItem from "./ReadingItem";
import Navbar from "./NavBar";
import Layout from "./Layout";
import { Link } from "react-router-dom";
import { Typography } from "@material-tailwind/react";

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

  const isShabbat = endOfWeek.getDay() == new Date().getDay();

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
    <Layout>
      <Navbar />

      <div className="grid grid-flow-row gap-6 pb-2 text-center m-auto">
        <Typography variant="h4" className="text-primary">
          Reading Plan
        </Typography>
        <label htmlFor="date-picker">Select a date: </label>
        <input
          type="date"
          id="date-picker"
          style={{ display: "flex", justifyContent: "center" }}
          value={selectedDate}
          onChange={handleDateChange}
        />
        <h4>{isShabbat ? "Shabbat Shalom! 🎺" : null}</h4>
        <h3>{dateRange}</h3>
        {weeklyReadings && weeklyReadings.length > 0 ? (
          <div>
            {weeklyReadings.map((reading, index) => {
              return (
                reading.passage && (
                  <div key={index} className="flex flex-col justify-center">
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
        <section className="grid gap-5 mt-20">
          <p>To use mobile, you need to install YouVersion</p>
          <div style={{ display: "flex", flexDirection: "row", justifyContent: "space-evenly" }}>
            <a
              className="link link-accent"
              href="https://play.google.com/store/apps/details?id=com.sirma.mobile.bible.android&hl=en_US"
            >
              Android
            </a>{" "}
            <a className="link link-accent" href="https://app.bible.com/app-ios">
              iOS
            </a>
          </div>
          <Link className="link link-info text-center mt-2" to="/plan">
            Full 2 year reading plan
          </Link>
        </section>
      </div>
    </Layout>
  );
};

export default FilteredReadingPlan;
