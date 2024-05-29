import Layout from "../../Layout";
import readingPlan from "../../../bible_plan.json";

import React, { useState, useEffect } from "react";
import Navbar from "../../NavBar";
import ScrollToTop from "../../Shared/ScrollToTop";

export default function ReadingTable() {
  return (
    <Layout>
      <Navbar />
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: "10px", // Reduce font size
          media: "print",
        }}
      >
        <thead>
          <tr>
            <th style={{ border: "solid 1px black", padding: "4px" }}>Book</th>
            <th style={{ border: "solid 1px black", padding: "4px" }}>Week of</th>
          </tr>
        </thead>
        <tbody>
          {readingPlan.map((reading, index) => (
            <tr key={index}>
              <td style={{ border: "solid 1px black", padding: "4px" }}>{reading.passage}</td>
              <td style={{ border: "solid 1px black", padding: "4px" }}>{reading.date}</td>
            </tr>
          ))}
        </tbody>
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
