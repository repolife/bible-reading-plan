import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav>
      <ul style={{ display: "flex", flexDirection: "row", justifyContent: "space-between", minWidth: "max-content" }}>
        <li style={{ listStyle: "none" }}>
          <Link to="/">Reading Plan</Link>
        </li>
        <li style={{ listStyle: "none" }}>
          <Link to="/Songs">Songs</Link>
        </li>
        <li style={{ listStyle: "none" }}>
          <Link to="/events">Events</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
