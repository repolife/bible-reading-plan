import React, { useState, useEffect } from "react";
import { ChevronDoubleUpIcon } from "@heroicons/react/24/solid";
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
    <div
      type="button"
      title="Return to top"
      onClick={scrollToTop}
      className={`fixed bottom-5 right-0 mr-4 bg-info-content p-2 cursor-pointer rounded-full ${isVisible ? "inline" : "hidden"}`}
    >
      <ChevronDoubleUpIcon className="text-accent text-2xl w-6 h-6" />
    </div>
  );
}
