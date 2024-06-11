import React from "react";
import { Link } from "react-router-dom";

const Nav = () => {
  return (
    <div className="navbar bg-base-100 w-screen flex flex-row items-center">
      <div className="flex-1">
        <Link to="/" className="btn btn-ghost text-xl">
          Reading Plan
        </Link>
      </div>
      <div className="flex-none">
        <ul className="menu menu-horizontal px-1">
          <li>
            <Link to="/songs">Songs</Link>
          </li>
        </ul>
      </div>
    </div>
  );
};

export default Nav;
