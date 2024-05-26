import Layout from "../../Layout";
import readingPlan from "../../../bible_plan.json";

import React from "react";
import Navbar from "../../NavBar";

export default function ReadingTable() {
  return (
    <Layout>
      <Navbar />
      <table style={{ width: "100%", media: "screen", border: "solid 1px white" }}>
        <tr>
          <th style={{ border: "solid 1px white" }}>Book</th>
          <th style={{ border: "solid 1px white" }}>Week of</th>
        </tr>
        {readingPlan.map((reading, index) => {
          return (
            <>
              <tr>
                <td style={{ border: "solid 1px white" }}>{reading.passage}</td>
                <td style={{ border: "solid 1px white" }}>{reading.date}</td>
              </tr>
            </>
          );
        })}
      </table>
    </Layout>
  );
}
