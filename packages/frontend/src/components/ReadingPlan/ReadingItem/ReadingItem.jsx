import { useMemo } from "react";
import youVersion from "data/youversion.json";

export const ReadingItem = ({ passage }) => {
  const preparedPassage = useMemo(() => {
    const words = passage.split(" ");
    const chapter = words[words.length - 1];
    const parsedBook = words.slice(0, -1).join(" ");
    const filteredBook = youVersion.filter((b) => b.name === parsedBook);
    return { parsedBook, filteredBook, chapter };
  }, [passage]);

  if (!preparedPassage?.filteredBook?.[0]) return <p className="text-sm text-[#3d6e70]">{passage}</p>;

  const { filteredBook, chapter } = preparedPassage;
  // Seed Scroll's canonical chapter link: a web reader in the browser, and
  // opens the Seed Scroll app instead on phones that have it installed.
  const bookSlug = filteredBook[0].name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const seedScroll = `https://seedscroll.app/bible/${bookSlug}/${chapter}`;

  return (
    <a
      href={seedScroll}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center justify-center bg-[#e7f4f5] border border-[#9fd4d5] text-[#0b7678] text-sm font-medium rounded-xl py-2.5 px-3 no-underline"
    >
      {passage}
    </a>
  );
};
