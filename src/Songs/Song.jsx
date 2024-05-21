import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "contentful";
import { useState } from "react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import Navbar from "../NavBar";

const env = import.meta.env;

const client = createClient({
  space: env.VITE_SPACE_ID,
  accessToken: env.VITE_CONTENT_ID,
  environment: "master",
});

export const Song = () => {
  const { songId } = useParams();
  const [song, setSong] = useState(null);

  useEffect(() => {
    if (songId === undefined) return;
    console.log(songId);
    const fetchReadingPlan = async () => {
      try {
        const response = await client.getEntry(songId);
        const data = response.fields.lyrics;
        setSong(data);
      } catch (error) {
        console.error("Error fetching data from Contentful", error);
      }
    };

    fetchReadingPlan();
  }, [songId]);

  if (!song) {
    return null;
  }

  console.log(song);

  return (
    <>
      <Navbar />
      {documentToReactComponents(song)}
    </>
  );
};
