import { useMemo } from "react";
import youVersion from "data/youversion.json";

export const ReadingItem = ({ passage }) => {
  const preparedPassage = useMemo(() => {
    const words = passage.split(" ");
    const firstWord = words[0];
    let parsedBook, chapter, filteredBook;

    if (isNaN(Number(firstWord))) {
      parsedBook = firstWord;
      chapter = words.pop();
      filteredBook = youVersion.filter((b) => b.name === parsedBook);
    } else {
      parsedBook = `${firstWord} ${words[1]}`;
      chapter = words.pop();
      filteredBook = youVersion.filter((b) => b.name === parsedBook);
    }

    return { parsedBook, filteredBook, chapter };
  }, [passage]);

  if (!preparedPassage?.filteredBook?.[0]) return <p className="text-sm text-[#3d6e70]">{passage}</p>;

  const { filteredBook, chapter } = preparedPassage;
  const audioBible = `https://www.bible.com/bible/111/${filteredBook[0].code}.${chapter}`;
  const blueLetter = `https://www.blueletterbible.org/esv/${filteredBook[0].code}/${chapter}`;

  return (
    <div className="flex gap-2 items-center">
      <a
        href={blueLetter}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center bg-[#e7f4f5] border border-[#9fd4d5] text-[#0b7678] text-sm font-medium rounded-xl py-2.5 px-3 no-underline"
      >
        {passage}
      </a>
      <a
        href={audioBible}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center bg-[#0e9496] text-white text-xs font-semibold rounded-xl py-2.5 px-3 no-underline w-20"
      >
        Mobile
      </a>
    </div>
  );
};
