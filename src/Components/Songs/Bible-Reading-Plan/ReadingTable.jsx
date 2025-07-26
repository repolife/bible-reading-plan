import Layout from "shared/Layout/Layout";
import readingPlan from "data/bible_plan.json";
import React from "react";
import Nav from "shared/Nav/Nav";
import ScrollToTop from "../../Shared/ScrollToTop";
import { Typography } from "@material-tailwind/react";

// Function to group readings by date
const groupByDate = (readings) => {
  return readings.reduce((groupedReadings, reading) => {
    const { date, passage } = reading;
    if (!groupedReadings[date]) {
      groupedReadings[date] = [];
    }
    groupedReadings[date].push(passage);
    return groupedReadings;
  }, {});
};

export default function ReadingTable() {
  const groupedReadings = groupByDate(readingPlan);

  return (
    <>
      <Typography variant="h4" className="text-center text-secondary">
        Full 2 year reading plan
      </Typography>

      <div className="flex flex-wrap flex-row w-fit items-stretch print:flex print:border-collapse print:text-sm justify-center print:m-0 mx-8">
        {Object.keys(groupedReadings).map((date, index) => (
          <div
            key={index}
            className=" min-w-fit w-32 bg-blue-gray-50 text-accent-content  border-solid border-1 m-1 border-black p-2 flex flex-col"
          >
            <p className="print:text-xs text-xs font-bold pb-1 print:no-underline">
              Week of {date}
            </p>
            {groupedReadings[date].map((passage, index) => (
              <p key={index} className="p-1  text-xs text-center">
                {passage}
              </p>
            ))}
          </div>
        ))}
      </div>
      <ScrollToTop />
    </>
  );
}
