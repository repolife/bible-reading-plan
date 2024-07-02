import React from "react";
import youVersion from "data/youversion.json";

const ReadingItem = ({ passage }) => {
  const blueLetter = `https://www.blueletterbible.org/esv/${passage.replace(" ", "/")}`;

  let parsedBook = passage.split(" ")[0];
  let chapter = passage.split(" ")[1];
  let filteredBook = youVersion.filter((book) => book.name === parsedBook);

  let audioBible = `https://www.bible.com/bible/111/${filteredBook[0].code}.${chapter}`;

  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <a
        href={blueLetter}
        target="_blank"
        rel="noopener noreferrer"
        className="link link-primary visited:link-success m-1 p-1"
      >
        {passage}
      </a>
      <a
        href={audioBible}
        target="_blank"
        rel="noopener noreferrer"
        className="link link-primary visited:link-success m-1 p-1"
      >
        Mobile
      </a>
    </div>
  );
};

export default ReadingItem;
