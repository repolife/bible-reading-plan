import React from "react";
import { Spinner } from "./Spinner/Spinner";

export const Loader = () => (
  <div className="flex justify-center items-center w-full min-h-[400px]">
    <Spinner size="lg" text="Loading..." />
  </div>
);

