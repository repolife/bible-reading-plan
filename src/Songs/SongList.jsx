import React, { useEffect, useState } from "react";
import { createClient } from "contentful";
import { Link } from "react-router-dom";
import { useMemo } from "react";

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

    const meh = songs.filter((item) => item.title.toLowerCase().includes(inputValue.toLowerCase()));
    console.log(meh);
    return meh;
  }, [songs, inputValue]);

  return (
    <>
      <input type="text" placeholder="Type to filter" value={inputValue} onChange={handleInputChange} />{" "}
      {filteredSongs.length > 0 &&
        filteredSongs.map((song, index) => (
          <ul key={index}>
            <Link to={song.id}>{song.title}</Link>
          </ul>
        ))}
    </>
  );
};