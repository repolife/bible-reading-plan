import React, { useState, useEffect } from "react";
import { createClient } from "contentful";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import Nav from "shared/Nav/Nav";
import ScrollToTop from "../Shared/ScrollToTop";
import Layout from "shared/Layout/Layout";
import { Typography } from "@material-tailwind/react";
import { Spinner } from "../Shared/Spinner/Spinner";

const env = import.meta.env;

const client = createClient({
  space: env.VITE_SPACE_ID,
  accessToken: env.VITE_CONTENT_ID,
});

export const SongList = () => {
  const [songs, setSongs] = useState([]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(true);

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
          isShabbat:
            item.fields.isShabbat == undefined ? false : item.fields.isShabbat,
        }));

        setSongs(data);
        setIsLoading(false);
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
      .filter((item) =>
        item.title.toLowerCase().includes(inputValue.toLowerCase())
      )
      .sort((item) => item.isShabbat)
      .sort(
        (a, b) => b.isShabbat - a.isShabbat || a.title.localeCompare(b.title)
      );

    return meh;
  }, [songs, inputValue, setSongs]);

  return (
    <>
      {!isLoading ? (
        <div className="flex flex-col justify-center align-center text-center items-center">
          <Typography variant="h4" className="text-primary mb-5">
            Songs
          </Typography>
          <input
            className="p-2 m-2 border border-secondary focus:outline-none focus:border-accent w-1/2"
            type="text"
            placeholder="Filter songs"
            value={inputValue}
            onChange={handleInputChange}
          />
          {filteredSongs.length > 0 &&
            filteredSongs.sort().map((song, index) => (
              <ul
                className="m-4 text-lg link link-primary no-underline"
                key={index}
              >
                <Link
                  title={song.isShabbat ? "Shabbat song!" : ""}
                  to={song.id}
                >{`${song.title} ${song.isShabbat ? "🎺" : ""}`}</Link>
              </ul>
            ))}
        </div>
      ) : (
        <div className="flex justify-center items-center min-h-[400px] w-full">
          <Spinner size="md" text="Loading songs..." />
        </div>
      )}
      <ScrollToTop />
    </>
  );
};
