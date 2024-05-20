import React from "react";

const ReadingItem = ({ passage }) => {
  const blueLetter = `https://www.blueletterbible.org/esv/${passage.replace(" ", "/")}`;

  return (
    <a
      href={blueLetter}
      target="_blank"
      rel="noopener noreferrer"
      style={{ cursor: "pointer", color: "blue", textDecoration: "underline", margin: "0 5px" }}
    >
      {passage}
    </a>
  );
};

export default ReadingItem;
