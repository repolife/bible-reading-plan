import Layout from "../../Layout";
import readingPlan from "../../../bible_plan.json";
import React from "react";
import Navbar from "../../NavBar";
import ScrollToTop from "../../Shared/ScrollToTop";

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
      <Navbar />
      <table
        style={{
          borderCollapse: "collapse",
          fontSize: "10px", // Reduce font size
          media: "print",
          display: "flex",
          alignItems: "baseline",
          flexWrap: "wrap",
          width: "100vw",
        }}
      >
        {Object.keys(groupedReadings).map((date) => (
          <div key={date} style={{ border: "solid 1px" }}>
            <thead>
              <tr>
                <td style={{ padding: "5px", border: "solid 1px", fontWeight: "bolder", fontSize: "1.5em" }}>
                  Week of {date}
                </td>
              </tr>
            </thead>
            <tbody>
              {groupedReadings[date].map((passage, index) => (
                <tr>
                  <td style={{ padding: "4px", fontSize: "1.2em" }}>{passage}</td>
                </tr>
              ))}
            </tbody>
          </div>
        ))}
      </table>
      <ScrollToTop />

      <style>
        {`
          @media print {
            table {
              width: 100%;
              border-collapse: collapse;
              font-size: 10px;
            }
            th, td {
              border: 1px solid black;
              padding: 4px;
            }
          }
        `}
      </style>
    </Layout>
  );
}
