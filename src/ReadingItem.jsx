import React from "react";
import youVersion from "../youversion.json";

const ReadingItem = ({ passage }) => {
  const blueLetter = `https://www.blueletterbible.org/esv/${passage.replace(" ", "/")}`;

  let parsedBook = passage.split(" ")[0];
  let chapter = passage.split(" ")[1];
  let filteredBook = youVersion.filter((book) => book.name === parsedBook);

  let audioBible = `https://www.bible.com/bible/111/${filteredBook[0].code}.${chapter}.ESV`;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <a
        href={blueLetter}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          cursor: "pointer",
          color: "gray",
          ":visited": "red",
          textDecoration: "underline",
          margin: "1.5px",
          padding: "1em",
        }}
      >
        {passage}
      </a>
      <a
        href={audioBible}
        target="_blank"
        rel="noopener noreferrer"
        style={{
          cursor: "pointer",
          color: "gray",
          ":visited": "red",
          textDecoration: "underline",
          margin: "1.5px",
          padding: "1em",
        }}
      >
        Mobile
      </a>
    </div>
  );
};

export default ReadingItem;
