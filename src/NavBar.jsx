import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav>
      <ul style={{ display: "flex", flexDirection: "row", justifyContent: "center" }}>
        <li style={{ listStyle: "none", padding: "20px" }}>
          <Link to="/">Reading Plan</Link>
        </li>
        <li style={{ listStyle: "none", padding: "20px" }}>
          <Link to="/Songs">Songs</Link>
        </li>
        <li style={{ listStyle: "none", padding: "20px" }}>
          <Link to="/events">Events</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
