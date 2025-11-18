import { useMemo } from "react";
import youVersion from "data/youversion.json";
import { Button } from "@material-tailwind/react";

// ReadingItem component
export const ReadingItem = ({ passage }) => {
  //  let parsedBook = passage.split(" ")[0];
  //let chapter = passage.split(" ")[1];

  const preparedPassage = useMemo(() => {
    const words = passage.split(" ");
    const firstWord = words[0];
    let parsedBook = null;
    let chapter = null;
    let filteredBook = null;

    if (isNaN(Number(firstWord))) {
      parsedBook = firstWord;
      chapter = words.pop();
      filteredBook = youVersion.filter((book) => book.name === parsedBook);

      return {
        parsedBook,
        filteredBook,
        chapter,
      };
    }

    if (!isNaN(Number(firstWord))) {
      parsedBook = `${firstWord} ${words[1]}`;
      chapter = words.pop();
      filteredBook = youVersion.filter((book) => book.name === parsedBook);

      console.log(passage, `chapter: ${chapter}`);
      return {
        parsedBook,
        chapter,
        filteredBook,
      };
    }

    return null;
  }, [passage]);

  let audioBible = preparedPassage
    ? `https://www.bible.com/bible/111/${preparedPassage.filteredBook[0].code}.${preparedPassage.chapter}`
    : null;

  const blueLetter = `https://www.blueletterbible.org/esv/${preparedPassage.filteredBook[0].code}/${preparedPassage.chapter}`;
  if (!preparedPassage) {
    return <h2>{passage}</h2>;
  }
  return (
    <div
    className="flex flex-row content-center w-full lg:w-1/2 m-auto items-center gap-2"
      
    >
      <Button
        as="a"
        href={blueLetter}
        target="_blank"
        rel="noopener noreferrer"
        className="link link-primary-light visited:link-light m-1 p-1 flex-1 h-12 flex items-center justify-center"
      >
        {passage}
      </Button>
      <Button
        as="a"
        href={audioBible}
        target="_blank"
        rel="noopener noreferrer"
        className="link link-primary-light visited:link-success m-1 p-1 flex-1 h-12 flex items-center justify-center"
      >
        Mobile
      </Button>
    </div>
  );
};

