import React, { useState, useMemo } from "react";
import readingPlan from "data/bible_plan.json";
import ReadingItem from "../ReadingItem/ReadingItem";
import Nav from "shared/Nav/Nav";
import Layout from "shared/Layout/Layout";
import { Link } from "react-router-dom";
import { Button, Card, Typography } from "@material-tailwind/react";
import { DayPicker } from "react-day-picker";
import { Input } from "@material-tailwind/react";
import { ErrorBoundary } from "react-error-boundary";
import { Chip } from "@material-tailwind/react";
import { MonthlyEventsPreview } from '@components/Calendar/MonthlyEventsPreview'
import { CreatePrayerRequest } from "../../PrayerRequest/CreatePrayerRequest";
import { WeeklyPrayerRequests } from "../../PrayerRequest/WeeklyPrayerRequests";

const FilteredReadingPlan = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
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
    <Card className="w-full lg:w-1/2 grid grid-flow-row gap-6 pb-2 text-center m-auto bg-secondary-foreground p-4">
        <MonthlyEventsPreview />
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
      <label htmlFor="date-picker" className="text-neutral-700 dark:text-neutral-300">Select a date: </label>
      <input
        type="date"
        id="date-picker"
        className="flex flex-col justify-center text-center items-center px-4 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-neutral-50 dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 focus:border-brand-primary focus:outline-none"
        value={selectedDate}
        onChange={handleDateChange}
      />
      <h4 className="text-neutral-800 dark:text-neutral-200">{isShabbat ? "Shabbat Shalom! 🎺" : null}</h4>
      <h3 className="text-neutral-700 dark:text-neutral-300">{dateRange}</h3>
      {weeklyReadings && weeklyReadings.length > 0 ? (
        <div>
          {weeklyReadings.map((reading, index) => {
            return (
              reading.passage && (
                <div key={index} className="flex flex-col justify-center">
                  {reading.passage.split("; ").map((passage, i) => (
                    <ErrorBoundary
                      key={`${index}-${i}`}
                      FallbackComponent={ErrorBoundary}
                    >
                      <ReadingItem key={`${index}-${i}`} passage={passage} />
                    </ErrorBoundary>
                  ))}
                </div>
              )
            );
          })}
        </div>
      ) : (
        <p className="text-neutral-600 dark:text-neutral-400">No readings scheduled for this week.</p>
      )}
      <section className="grid gap-5 mt-20">
        <p className="text-neutral-600 dark:text-neutral-400">To use mobile, you need to install YouVersion</p>
        <div
          style={{
            display: "flex",
            flexDirection: "row",
            justifyContent: "space-evenly",
          }}
        >
          <Button as="a"  variant="ghost" href="https://play.google.com/store/apps/details?id=com.sirma.mobile.bible.android&hl=en_US" className="bg-primary hover:bg-primary-dark text-white shadow-lg shadow-primary/25 rounded-full w-12 h-12 flex items-center justify-center transition-all duration-200 hover:scale-105">
            <i className="fa-brands fa-google-play text-2xl text-white" />
          </Button>
          <Button as="a" variant="ghost" href="https://app.bible.com/app-ios" className="bg-primary hover:bg-primary-dark text-white shadow-lg shadow-brand-primary/25 rounded-full w-12 h-12 flex items-center justify-center transition-all duration-200 hover:scale-105">
            <i className="fa-brands fa-app-store-ios text-2xl text-white" />
          </Button>
        </div>
        <Button 
          variant="ghost"
          as="a"
          className="link-primary-light hover:text-brand-600 dark:text-brand-400 dark:hover:text-brand-300 underline hover:no-underline transition-colors text-center mt-2 font-medium" 
          href="/plan"
        >
          Full 2 year reading plan
        </Button>
      </section>
      <WeeklyPrayerRequests />
    </Card>
  );
};

export default FilteredReadingPlan;
