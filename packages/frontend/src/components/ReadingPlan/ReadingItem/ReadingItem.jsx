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
  const bookSlug = filteredBook[0].name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const chapterPath = `bible/${bookSlug}/${chapter}?translation=kjv`;
  // The Seed Scroll web reader. The app only claims seedscroll.app links, so
  // the mobile button uses that host to open the app when it is installed.
  const webReader = `https://app.seedscroll.app/${chapterPath}`;
  const mobileApp = `https://seedscroll.app/${chapterPath}`;

  return (
    <div className="flex gap-2 items-center">
      <a
        href={webReader}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex items-center justify-center bg-[#e7f4f5] border border-[#9fd4d5] text-[#0b7678] text-sm font-medium rounded-xl py-2.5 px-3 no-underline"
      >
        {passage}
      </a>
      <a
        href={mobileApp}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center bg-[#0e9496] text-white text-xs font-semibold rounded-xl py-2.5 px-3 no-underline w-20"
      >
        App
      </a>
    </div>
  );
};
