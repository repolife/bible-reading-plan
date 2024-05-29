import React, { useState, useEffect } from "react";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.pageYOffset > 300) {
      setIsVisible(true);
    } else {
      setIsVisible(false);
    }
  };

  // Scroll to the top of the page
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  useEffect(() => {
    window.addEventListener("scroll", toggleVisibility);
    return () => {
      window.removeEventListener("scroll", toggleVisibility);
    };
  }, []);

  return (
    <button
      type="button"
      title="Return to top"
      onClick={scrollToTop}
      style={{
        position: "fixed",
        bottom: "50px",
        right: "30px",
        display: isVisible ? "inline" : "none",
        backgroundColor: "#000",
        color: "#fff",
        border: "none",
        padding: "10px",
        cursor: "pointer",
        fontSize: "20px",
      }}
    >
      ↑
    </button>
  );
}
