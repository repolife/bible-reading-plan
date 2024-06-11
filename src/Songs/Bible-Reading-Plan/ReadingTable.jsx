import Layout from "../../Layout";
import readingPlan from "../../../bible_plan.json";
import React from "react";
import Navbar from "../../NavBar";
import ScrollToTop from "../../Shared/ScrollToTop";
import { Card, Typography } from "@material-tailwind/react";

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
    <Layout>
      <Navbar className="print:hidden" />
      <table className="flex flex-wrap flex-row w-screen items-stretch print:flex print:border-collapse print:text-sm ">
        {Object.keys(groupedReadings).map((date, index) => (
          <div
            key={index}
            className=" w-fit bg-blue-gray-50 text-accent-content  border-solid border-1 m-1 border-black p-2"
          >
            <thead>
              <tr>
                <td className="print:text-xs text-xs font-bold pb-1 print:no-underline">Week of {date}</td>
              </tr>
            </thead>
            <tbody>
              {groupedReadings[date].map((passage, index) => (
                <tr key={index}>
                  <td className="p-1  text-xs text-center">{passage}</td>
                </tr>
              ))}
            </tbody>
          </div>
        ))}
      </table>
      <ScrollToTop />
    </Layout>
  );
}
