import React, { useEffect } from "react";
import { useParams } from "react-router-dom";
import { createClient } from "contentful";
import { useState } from "react";
import { documentToReactComponents } from "@contentful/rich-text-react-renderer";
import { BLOCKS, MARKS } from "@contentful/rich-text-types";

import Navbar from "../NavBar";
import Layout from "../Layout";
import { SongList } from "./SongList";
import ScrollToTop from "../Shared/ScrollToTop";

const env = import.meta.env;

const client = createClient({
  space: env.VITE_SPACE_ID,
  accessToken: env.VITE_CONTENT_ID,
  environment: "master",
});

export const Song = () => {
  const { songId } = useParams();
  const [song, setSong] = useState(null);
  const [songtitle, setSongTitle] = useState("");

  useEffect(() => {
    if (songId === undefined) return;
    console.log(songId);
    const fetchReadingPlan = async () => {
      try {
        const response = await client.getEntry(songId);
        const title = response.fields.title;
        setSongTitle(title);
        const data = response.fields.lyrics;
        setSong(data);
        console.log(data);
      } catch (error) {
        console.error("Error fetching data from Contentful", error);
      }
    };

    fetchReadingPlan();
  }, [songId]);

  if (!song) {
    return null;
  }
  const Text = ({ children }) => <p className="text-center  pb-10">{children}</p>;

  const options = {
    renderNode: {
      [BLOCKS.PARAGRAPH]: (node, children) => <Text>{children}</Text>,
    },
    renderText: (text) =>
      text.split("\n").reduce((children, textSegment, index) => {
        return [...children, index > 0 && <br key={index} />, textSegment];
      }, []),
  };

  return (
    <Layout>
      <Navbar />

      <div className="flex flex-col justify-center content-center items-center ">
        {songtitle !== "" ? <h4 className="text-3xl mb-4 text-accent">{songtitle}</h4> : null}
        <div className="text-2xl text-center w-screen h-screen  p-4"> {documentToReactComponents(song, options)}</div>
      </div>
      <ScrollToTop />
    </Layout>
  );
};
