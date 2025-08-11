import React from "react";

export default function Layout({ children }) {
  return (
    <div className="container grid grid-flow-row gap-5 w-auto m-auto min-w-fit min-h-max h-fit">
      {children}
    </div>
  );
}
