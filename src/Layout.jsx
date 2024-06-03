import React from "react";

export default function Layout({ children }) {
  return <div style={{ height: "100vh", width: "100vw", maxWidth: "max-content", padding: "2em" }}>{children}</div>;
}
