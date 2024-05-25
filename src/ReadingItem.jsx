import React from "react";

const ReadingItem = ({ passage }) => {
  const blueLetter = `https://www.blueletterbible.org/esv/${passage.replace(" ", "/")}`;

  return (
    <a
      href={blueLetter}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        cursor: "pointer",
        color: "white",
        ":visited": "red",
        textDecoration: "underline",
        margin: "1.5px",
        padding: "1em",
      }}
    >
      {passage}
    </a>
  );
};

export default ReadingItem;
