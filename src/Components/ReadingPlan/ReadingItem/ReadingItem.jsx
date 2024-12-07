import React from "react";
import youVersion from "data/youversion.json";
import { useMemo } from "react";

const ReadingItem = ({ passage }) => {
  const blueLetter = `https://www.blueletterbible.org/esv/${passage.replace(" ", "/")}`;

  let parsedBook = passage.split(" ")[0];
  let chapter = passage.split(" ")[1];

  const prepraredFilteredBook = useMemo(() => {
    const firstWord = passage.split(" ")[0];
    if (isNaN(Number(firstWord))) {
      return youVersion.filter((book) => book.name === parsedBook);
    }

    return null;
  }, [passage]);
  let audioBible = prepraredFilteredBook
    ? `https://www.bible.com/bible/111/${prepraredFilteredBook[0].code}.${chapter}`
    : null;

  if (!prepraredFilteredBook) {
    return <h2>{passage}</h2>;
  }
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
      }}
    >
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
