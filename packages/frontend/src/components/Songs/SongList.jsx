import { useState, useEffect, useMemo } from "react";
import { createClient } from "@sanity/client";
import { Link } from "react-router-dom";
import { ScrollToTop } from "@components/Shared/ScrollToTop";
import { Spinner } from "@components/Shared/Spinner/Spinner";
import { useAuthStore } from "@store/useAuthStore";
import { useProfileStore } from "@store/useProfileStore";

const client = createClient({
  projectId: '0yfb94zm',
  dataset:   'production',
  apiVersion: "2024-01-01",
  useCdn:    true,
});

export const SongList = () => {
  const [songs, setSongs] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const { user } = useAuthStore();
  const { profiles, fetchAllUserProfiles } = useProfileStore();

  useEffect(() => { fetchAllUserProfiles() }, [fetchAllUserProfiles]);

  const isAdmin = (profiles || []).find((p) => p.id === user?.id)?.is_admin === true;

  useEffect(() => {
    client
      .fetch(`*[_type == "song"] { _id, title, isShabbat }`)
      .then((items) => {
        setSongs(items.map((item) => ({
          title:     item.title,
          id:        item._id,
          isShabbat: item.isShabbat ?? false,
        })));
        setIsLoading(false);
      })
      .catch((err) => { console.error(err); setIsLoading(false); });
  }, []);

  const filteredSongs = useMemo(() => {
    const list = inputValue
      ? songs.filter((s) => s.title.toLowerCase().includes(inputValue.toLowerCase()))
      : [...songs];
    return list.sort((a, b) => {
      if (a.isShabbat !== b.isShabbat) return b.isShabbat ? 1 : -1;
      return a.title.localeCompare(b.title);
    });
  }, [songs, inputValue]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Spinner size="md" text="Loading songs..." />
      </div>
    );
  }

  return (
    <div className="px-4 py-5 space-y-4 max-w-lg mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#0b2020]">Songs</h1>
        <div className="flex items-center gap-2">
          <a
            href="https://mo-fellowship.sanity.studio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-[#0e9496] text-white hover:bg-[#0c7c7e] transition-colors font-medium"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
            </svg>
            Add Song
          </a>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#0e9496" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
          </svg>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-3 bg-white border border-[#c8e8e9] rounded-full px-4 py-2.5">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="#3d6e70" className="w-5 h-5 shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
        </svg>
        <input
          type="text"
          placeholder="Filter songs…"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          className="flex-1 bg-transparent text-sm text-[#0b2020] placeholder-[#3d6e70] outline-none"
        />
      </div>

      {/* Shabbat badge */}
      <div className="flex">
        <span className="text-xs font-medium bg-[#e7f4f5] border border-[#9fd4d5] text-[#0b7678] px-3 py-1 rounded-full">
          🎺 Shabbat songs shown first
        </span>
      </div>

      {/* Song list */}
      <div className="space-y-2">
        {filteredSongs.map((song) => (
          <Link
            key={song.id}
            to={`/songs/${song.id}`}
            className="flex items-center justify-between bg-white border border-[#c8e8e9] rounded-xl px-4 py-3.5 no-underline"
          >
            <div className="flex items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke={song.isShabbat ? "#0e9496" : "#3d6e70"} className="w-4 h-4 shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
              </svg>
              <span className="text-[15px] font-medium text-[#0b2020]">
                {song.title}{song.isShabbat ? " 🎺" : ""}
              </span>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="#3d6e70" className="w-4 h-4 shrink-0">
              <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        ))}
        {filteredSongs.length === 0 && (
          <p className="text-center text-sm text-[#3d6e70] py-8">No songs found.</p>
        )}
      </div>

      <ScrollToTop />
    </div>
  );
};
