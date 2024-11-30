import React, { useState, useMemo } from "react";
import readingPlan from "data/bible_plan.json";
import ReadingItem from "../ReadingItem/ReadingItem";
import Nav from "shared/Nav/Nav";
import Layout from "shared/Layout/Layout";
import { Link } from "react-router-dom";
import { Typography } from "@material-tailwind/react";
import { DayPicker } from "react-day-picker";
import { Input } from "@material-tailwind/react";
import { IconButton } from "@material-tailwind/react";
import { ErrorBoundary } from "react-error-boundary";

const FilteredReadingPlan = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );

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

    return readingPlan.filter((entry) => {
      const entryDate = new Date(entry.date);

      if (entryDate === undefined) {
        console.log("empty", entry);
        return false;
      }
      return entryDate >= startOfWeek && entryDate <= endOfWeek;
    });
  }, [selectedDate, readingPlan]);

  let dateRange = `${startOfWeek.toLocaleDateString("default", { weekday: "long" })} (${startOfWeek.toLocaleDateString()}) - ${endOfWeek.toLocaleDateString("default", { weekday: "long" })} (${endOfWeek.toLocaleDateString()})`;

  return (
    <Layout>
      <Nav />

      <div className="grid grid-flow-row gap-6 pb-2 text-center m-auto">
        <Typography
          variant="h4"
          className="text-primary flex flex-row items-center justify-between"
        >
          Reading Plan
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="size-6"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
            />
          </svg>
        </Typography>
        <label htmlFor="date-picker">Select a date: </label>
        <input
          type="date"
          id="date-picker"
          className="flex flex-col jusitfy-center text-center items-center"
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
                      <ErrorBoundary FallbackComponent={ErrorBoundary}>
                        <ReadingItem key={i} passage={passage} />
                      </ErrorBoundary>
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
          <div
            style={{
              display: "flex",
              flexDirection: "row",
              justifyContent: "space-evenly",
            }}
          >
            <a href="https://play.google.com/store/apps/details?id=com.sirma.mobile.bible.android&hl=en_US">
              <IconButton className="link link-accent">
                <i className="fa-brands fa-google-play text-3xl text-accent" />
              </IconButton>{" "}
            </a>{" "}
            <a href="https://app.bible.com/app-ios">
              <IconButton as="a" className="link link-primary">
                <i className="fa-brands fa-app-store-ios text-3xl text-accent" />
              </IconButton>
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
