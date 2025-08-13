import React from "react";
import { Typography } from "@material-tailwind/react";

export const Spinner = ({ 
  size = "md", 
  text = "Loading...", 
  showText = true,
  className = "",
  fullScreen = false
}) => {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-4",
    lg: "w-12 h-12 border-4",
    xl: "w-16 h-16 border-4"
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 bg-white dark:bg-neutral-900 bg-opacity-90 dark:bg-opacity-90 flex flex-col items-center justify-center gap-4 z-50">
        <div className={`${sizeClasses[size]} border-neutral-300 dark:border-neutral-600 border-t-brand-primary rounded-full animate-spin`}></div>
        {showText && (
          <Typography className="text-neutral-700 dark:text-neutral-300 text-center">
            {text}
          </Typography>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-4 min-h-[200px] ${className}`}>
      <div className={`${sizeClasses[size]} border-neutral-300 dark:border-neutral-600 border-t-brand-primary rounded-full animate-spin`}></div>
      {showText && (
        <Typography className="text-neutral-700 dark:text-neutral-300 text-center">
          {text}
        </Typography>
      )}
    </div>
  );
}; 