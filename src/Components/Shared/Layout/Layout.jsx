import React from "react";

export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-default-background text-default-font">
      <div className="container mx-auto px-4 py-6">
        {children}
      </div>
    </div>
  );
}
