import { useState, useEffect } from "react";
import { createClient } from "contentful";
import { Link } from "react-router-dom";
import { useMemo } from "react";
import { ScrollToTop } from "@components/Shared/ScrollToTop";
import { Typography } from "@material-tailwind/react";
import { Spinner } from "@components/Shared/Spinner/Spinner";

const env = import.meta.env;

// Use VITE_CONTENT_ID as the primary access token, fallback to VITE_ACCESS_TOKEN
const accessToken = env.VITE_CONTENT_ID || env.VITE_ACCESS_TOKEN;

if (!accessToken) {
  console.error('Contentful access token is missing. Please set VITE_CONTENT_ID or VITE_ACCESS_TOKEN in your .env file');
}

const client = createClient({
  space: env.VITE_SPACE_ID,
  accessToken: accessToken || '',
  environment: "master",
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
    if (inputValue === "") return songs;

    const meh = songs
      .filter((item) =>
        item.title.toLowerCase().includes(inputValue.toLowerCase())
      )
      .sort((a, b) => {
        if (a.isShabbat !== b.isShabbat) {
          return b.isShabbat ? 1 : -1;
        }
        return a.title.localeCompare(b.title);
      });

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
            className="p-2 m-2 border border-secondary focus:outline-none focus:border-accent w-1/2 text-black"
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
