import React, { useEffect, useState } from "react";
import { createClient } from "contentful";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import Navbar from "../NavBar";
import ScrollToTop from "../Shared/ScrollToTop";

const env = import.meta.env;

const client = createClient({
  space: env.VITE_SPACE_ID,
  accessToken: env.VITE_CONTENT_ID,
});

export const SongList = () => {
  const [songs, setSongs] = useState([]);
  const [inputValue, setInputValue] = useState("");

  useEffect(() => {
    const fetchReadingPlan = async () => {
      try {
        const response = await client.getEntries({
          content_type: "song",
        });
        const data = response.items.map((item) => ({
          title: item.fields.title,
          id: item.sys.id,
          item: item,
          isShabbat: item.fields.isShabbat == undefined ? false : item.fields.isShabbat,
        }));

        setSongs(data);
      } catch (error) {
        console.error("Error fetching data from Contentful", error);
      }
    };

    fetchReadingPlan();
  }, []);

  const handleInputChange = (event) => {
    setInputValue(event.target.value);
  };

  const filteredSongs = useMemo(() => {
    if (!songs) return [];
    if (songs.length <= 0) return [];
    if (inputValue === "") songs;

    const meh = songs
      .filter((item) => item.title.toLowerCase().includes(inputValue.toLowerCase()))
      .sort((item) => item.isShabbat)
      .sort((a, b) => b.isShabbat - a.isShabbat || a.title.localeCompare(b.title));

    return meh;
  }, [songs, inputValue, setSongs]);

  console.log(songs);

  return (
    <>
      <Navbar />
      <input type="text" placeholder="Type to filter" value={inputValue} onChange={handleInputChange} />{" "}
      {filteredSongs.length > 0 &&
        filteredSongs.sort().map((song, index) => (
          <ul style={{ margin: "1em" }} key={index}>
            <Link
              title={song.isShabbat ? "Shabbat song!" : ""}
              to={song.id}
            >{`${song.title} ${song.isShabbat ? "🎺" : ""}`}</Link>
          </ul>
        ))}
      <ScrollToTop />
    </>
  );
};
