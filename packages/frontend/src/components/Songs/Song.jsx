import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "@sanity/client";
import { PortableText } from "@portabletext/react";
import { ScrollToTop } from "@components/Shared/ScrollToTop";

const client = createClient({
  projectId: import.meta.env.VITE_SANITY_PROJECT_ID,
  dataset:   import.meta.env.VITE_SANITY_DATASET,
  apiVersion: "2024-01-01",
  token:     import.meta.env.VITE_SANITY_TOKEN,
  useCdn:    true,
});

const FONT_SIZES = ['text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'];
const DEFAULT_SIZE = 2;

const portableTextComponents = (fontSize) => ({
  block: {
    normal: ({ children }) => (
      <p className={`${fontSize} leading-relaxed mb-6 whitespace-pre-wrap`}>{children}</p>
    ),
    h1: ({ children }) => <h1 className={`${fontSize} font-bold mb-4`}>{children}</h1>,
    h2: ({ children }) => <h2 className={`${fontSize} font-semibold mb-4`}>{children}</h2>,
    blockquote: ({ children }) => (
      <blockquote className={`${fontSize} border-l-4 border-[#0e9496] pl-4 mb-4 italic`}>{children}</blockquote>
    ),
  },
  marks: {
    strong: ({ children }) => <strong>{children}</strong>,
    em:     ({ children }) => <em>{children}</em>,
    link:   ({ value, children }) => (
      <a href={value?.href} target="_blank" rel="noopener noreferrer" className="text-[#0e9496] underline">{children}</a>
    ),
  },
});

export const Song = () => {
  const { songId } = useParams();
  const [song, setSong] = useState(null);
  const [sizeIdx, setSizeIdx] = useState(DEFAULT_SIZE);
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    if (!songId) return;
    client
      .fetch(`*[_type == "song" && _id == $id][0]`, { id: songId })
      .then((doc) => setSong(doc))
      .catch((err) => console.error("Error fetching song", err));
  }, [songId]);

  if (!song) return null;

  const fontSize = FONT_SIZES[sizeIdx];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-[#0b2020] dark:text-white leading-tight">{song.title}</h1>

        {/* Font size controls */}
        <div className="flex items-center gap-1 shrink-0 mt-1">
          <button
            onClick={() => setSizeIdx((i) => Math.max(0, i - 1))}
            disabled={sizeIdx === 0}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#c8e8e9] dark:border-neutral-700 text-[#0e9496] disabled:opacity-30 hover:bg-[#e0f5f5] dark:hover:bg-neutral-800 transition-colors"
            aria-label="Decrease font size"
          >
            <span className="text-sm font-bold">A</span>
          </button>
          <button
            onClick={() => setSizeIdx((i) => Math.min(FONT_SIZES.length - 1, i + 1))}
            disabled={sizeIdx === FONT_SIZES.length - 1}
            className="w-8 h-8 flex items-center justify-center rounded-lg border border-[#c8e8e9] dark:border-neutral-700 text-[#0e9496] disabled:opacity-30 hover:bg-[#e0f5f5] dark:hover:bg-neutral-800 transition-colors"
            aria-label="Increase font size"
          >
            <span className="text-lg font-bold">A</span>
          </button>
        </div>
      </div>

      {/* Lyrics */}
      {song.lyrics?.length > 0 && (
        <div className="text-[#0b2020] dark:text-neutral-100">
          <PortableText value={song.lyrics} components={portableTextComponents(fontSize)} />
        </div>
      )}

      {/* Notes */}
      {song.notes?.length > 0 && (
        <div className="mt-6 border-t border-[#c8e8e9] dark:border-neutral-700 pt-4">
          <button
            onClick={() => setNotesOpen((o) => !o)}
            className="flex items-center justify-between w-full text-left"
          >
            <span className="text-sm font-semibold text-[#0e9496] uppercase tracking-wide">Notes</span>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-4 h-4 text-[#0e9496] transition-transform ${notesOpen ? 'rotate-180' : ''}`}
            >
              <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
            </svg>
          </button>

          {notesOpen && (
            <div className="mt-3 text-[#0b2020] dark:text-neutral-200">
              <PortableText value={song.notes} components={portableTextComponents('text-sm')} />
            </div>
          )}
        </div>
      )}

      <ScrollToTop />
    </div>
  );
};
