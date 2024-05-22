import React from "react";
import Navbar from "./NavBar";
import Layout from "./Layout";

export default function Calendar() {
  return (
    <Layout>
      <Navbar />
      <p>
        If you can't see the calendar it's because you're not logged into google or you don't have access yet (request
        acces in telegram)
      </p>
      <div>
        <iframe
          src="https://calendar.google.com/calendar/embed?height=600&wkst=1&ctz=America%2FChicago&bgcolor=%23ffffff&src=YTRhM2U0ZDgyODE0NmYwMDUzNjA4NWQyYjcwOGE0MTdkM2YwNGQzNjZhODNjOTY2ZjZhYzc2YzA2MTBmMjJiNkBncm91cC5jYWxlbmRhci5nb29nbGUuY29t&color=%23795548"
          style={{ border: "solid 1px #777", width: "50vw", height: "50vh", frameborder: "0", scrolling: "no" }}
        />
      </div>
    </Layout>
  );
}
