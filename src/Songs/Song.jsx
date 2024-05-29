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

  const options = {
    renderText: (text) => {
      return text.split("\n").reduce((children, textSegment, index) => {
        console.log(textSegment.length);
        return [...children, index > 0 && <br key={index} />, textSegment];
      }, []);
    },
  };

  /*
  textSegment.length > 10 ? (
            <div>
              {" "}
              <p>{textSegment}</p> <br />
            </div>
          ) : (
            textSegment
          ),
          */

  // const Bold = ({ children }) => <p className="bold">{children}</p>;

  // const Text = ({ children }) => <p className="align-center">{children}</p>;

  // const options = {
  //   renderMark: {
  //     [MARKS.BOLD]: (text) => <Bold>{text}</Bold>,
  //   },
  //   renderNode: {
  //     [BLOCKS.PARAGRAPH]: (node, children) => {
  //       console.log(node.content.length);
  //       return node.content.length == 1 ? (
  //         <>
  //           <Text>{children}</Text> <br />
  //         </>
  //       ) : (
  //         <span style={{ display: "flex", justifyContent: "space-around", color: "gray" }}>{children}</span>
  //       );
  //     },
  //   },
  //   renderText: (text) => text.replace("Gsus4G", "?"),
  // };

  return (
    <Layout>
      <Navbar />

      {songtitle !== "" ? <h4>{songtitle}</h4> : null}
      <br />
      <div style={{ fontSize: "1em", minWidth: "50vw" }}> {documentToReactComponents(song, options)}</div>
      <ScrollToTop />
    </Layout>
  );
};
