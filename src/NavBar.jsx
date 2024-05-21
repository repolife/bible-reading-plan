import React from "react";
import { Link } from "react-router-dom";

const Navbar = () => {
  return (
    <nav>
      <ul>
        <li style={{ listStyle: "none" }}>
          <Link to="/">Home</Link>
        </li>
        <li style={{ listStyle: "none" }}>
          <Link to="/Songs">Songs</Link>
        </li>
      </ul>
    </nav>
  );
};

export default Navbar;
