import React from "react";

const ReadingItem = ({ passage }) => {
  const passageLink = `https://www.biblegateway.com/passage/?search=${passage.replace(" ", "+")}&version=ESV`;

  console.log(passageLink);

  return (
    <a
      href={passageLink}
      target="_blank"
      rel="noopener noreferrer"
      style={{ cursor: "pointer", color: "blue", textDecoration: "underline", margin: "0 5px" }}
    >
      {passage}
    </a>
  );
};

export default ReadingItem;
