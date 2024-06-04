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
      <table className=" text-l print:block flex flex-wrap flex-row w-screen items-stretch print:flex print:border-collapse print:text-sm">
        {Object.keys(groupedReadings).map((date, index) => (
          <div key={index} className="border-b border-blue-gray-100 bg-blue-gray-50 p-4 border border-slate-500 w-max">
            <thead>
              <tr>
                <td className=" border-b text-xl print:text-xs">Week of {date}</td>
              </tr>
            </thead>
            <tbody>
              {groupedReadings[date].map((passage, index) => (
                <tr key={index}>
                  <td className="p-2 text-xs">{passage}</td>
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
