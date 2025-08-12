import React from "react";
import { Spinner } from "./Spinner/Spinner";

export const Loader = () => (
  <div className="flex justify-center items-center w-full h-16">
    <Spinner size="lg" text="Loading..." />
  </div>
);

