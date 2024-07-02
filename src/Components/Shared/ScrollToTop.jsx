import React, { useState, useEffect } from "react";
import { ChevronDoubleUpIcon } from "@heroicons/react/24/solid";
import { IconButton } from "@material-tailwind/react";

export default function ScrollToTop() {
  const [isVisible, setIsVisible] = useState(false);

  const toggleVisibility = () => {
    if (window.scrollY > 300) {
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
  //bg-info-content
  return (
    <div className={`fixed bottom-2 right-0 mr-0 pr-2  cursor-pointer rounded-full ${isVisible ? "inline" : "hidden"}`}>
      <IconButton className=" bg-info-content text-blue-gray-50" type="button" variant="outlined" onClick={scrollToTop}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 18.75 7.5-7.5 7.5 7.5" />
          <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 7.5-7.5 7.5 7.5" />
        </svg>
      </IconButton>
    </div>
  );
}
