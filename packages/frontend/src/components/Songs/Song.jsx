import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "contentful";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS } from "@contentful/rich-text-types";
import { ScrollToTop } from "@components/Shared/ScrollToTop";

const env = import.meta.env;

const client = createClient({
  space: env.VITE_SPACE_ID,
  accessToken: env.VITE_CONTENT_ID || '',
  environment: "master",
});

const FONT_SIZES = ['text-base', 'text-lg', 'text-xl', 'text-2xl', 'text-3xl'];
const DEFAULT_SIZE = 2; // text-xl

const richTextOptions = (fontSize) => ({
  renderNode: {
    [BLOCKS.PARAGRAPH]: (node, children) => (
      <p className={`${fontSize} leading-relaxed mb-6 whitespace-pre-wrap`}>{children}</p>
    ),
  },
  renderText: (text) =>
    text.split("\n").reduce((acc, segment, i) => [
      ...acc, i > 0 && <br key={i} />, segment
    ], []),
});

export const Song = () => {
  const { songId } = useParams();
  const [song, setSong] = useState(null);
  const [notes, setNotes] = useState(null);
  const [title, setTitle] = useState("");
  const [sizeIdx, setSizeIdx] = useState(DEFAULT_SIZE);
  const [notesOpen, setNotesOpen] = useState(false);

  useEffect(() => {
    if (!songId) return;
    client.getEntry(songId)
      .then((res) => {
        setTitle(res.fields.title || "");
        setSong(res.fields.lyrics || null);
        setNotes(res.fields.notes || null);
      })
      .catch((err) => console.error("Error fetching song", err));
  }, [songId]);

  if (!song) return null;

  const fontSize = FONT_SIZES[sizeIdx];

  return (
    <div className="max-w-lg mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <h1 className="text-2xl font-bold text-[#0b2020] dark:text-white leading-tight">{title}</h1>

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
      <div className="text-[#0b2020] dark:text-neutral-100">
        {documentToReactComponents(song, richTextOptions(fontSize))}
      </div>

      {/* Notes */}
      {notes && (
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
              {documentToReactComponents(notes, richTextOptions('text-sm'))}
            </div>
          )}
        </div>
      )}

      <ScrollToTop />
    </div>
  );
};
