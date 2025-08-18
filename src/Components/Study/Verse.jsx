import { useState, useCallback, useMemo } from "react";
import { useQuery } from "react-query";
import axios from "axios";
import testament from "data/testament.json";
import { useParams } from "react-router-dom";
import { Badge, Card, CardBody, Typography } from "@material-tailwind/react";
import strongs from "strongs";

export const Verse = () => {
  const [strongsCode, setStrongsCode] = useState("");
  const [strongsNumber, setStrongsNumber] = useState("");
  const [dataText, setDataText] = useState("");
  const [strongsObject, setStrongsObject] = useState(undefined);
  const [selectedIndex, setSelecteIndex] = useState(null);

  let { book, chapter, verse } = useParams();

  let formatedBook = book.charAt(0).toLocaleUpperCase() + book.slice(1);

  const bibleQuery = `/search/verses-w-strongs.php? `;

  const config = {
    url: `https://jsonbible.com/search/verses-w-strongs.php?json={ "book": "${formatedBook}",  "chapter": "${chapter}", "verse": "${verse}", "found": -1, "next_chapter": "read-joh-4" }`,
    matchContext: "Infinity",
    method: "post",
  };
  const { data, isPending, isError, error } = useQuery({
    queryKey: ["todos"],
    enabled: (book && chapter && verse) !== undefined,
    queryFn: async () => {
      const res = await axios.request(config);
      return res.data;
    },
  });

  const filteredTestament = useMemo(() => {
    if (!data) return;
    if (data.book === undefined) return;
    if (!testament) return;

    const filteredBook = testament.filter(
      (t) => t.book.toLocaleLowerCase() === data.book.toLocaleLowerCase(),
    );
    return filteredBook[0].testament;
  }, [data, testament, book]);

  let handleStrongsDef = (strongsCode, word, key) => {
    if (strongsCode === "" || strongsCode === undefined) return;
    setStrongsNumber(strongsCode);
    setSelecteIndex(key);
  };

  const renderVerseText = useCallback(
    (text) => {
      const regex = /\[data strongs="(\d+)"\](.*?)\[\/data\]/g;
      const parts = [];

      let lastIndex = 0;
      text.replace(regex, (match, p1, p2, offset) => {
        parts.push(text.slice(lastIndex, offset));
        parts.push(
          <Badge
            className="mb-4 min-h-1 min-w-1 cursor-pointer"
            // content={`${strongsCode}${p1}`}
            color={`${selectedIndex === offset ? "amber" : "primary"}`}
            key={offset}
            onClick={() => handleStrongsDef(p1, p2, offset)}
            data-strongs={p1}
            children={<Typography className="text-xl"> {p2}</Typography>}
          />,
        );
        lastIndex = offset + match.length;
      });

      parts.push(text.slice(lastIndex));

      return parts;
    },
    [selectedIndex, setSelecteIndex],
  );

  const strongsDef = useMemo(() => {
    if (strongsNumber === undefined) return undefined;
    if (!filteredTestament) return undefined;

    let strongsObj = undefined;

    if (filteredTestament === "OT") {
      let hebrewCode = `H${strongsNumber}`;

      setStrongsCode(hebrewCode);
      strongsObj = strongs[hebrewCode];
    }

    if (filteredTestament === "NT") {
      let greekCode = `G${strongsNumber}`;

      setStrongsCode(greekCode);

      strongsObj = strongs[greekCode];
    }

    if (strongsObj !== undefined) return Object.entries(strongsObj);
  }, [strongsNumber, filteredTestament]);

  if (!data) {
    return <h2>no</h2>;
  }

  return (
    <Card className="h-screen">
      <CardBody>
        <Typography variant="h4">
          {data.book} {data.chapter}:{data.verses} ({data.version})
        </Typography>
        <Typography className="text-xl pt-4">
          {" "}
          {renderVerseText(data.text)}
        </Typography>

        {strongsDef && strongsDef.length > 0 && (
          <div className="border-gray-500 border-2 border-solid p-2 mt-10 ">
            <h3 className="text-left uppercase font-bold">Strongs</h3>
            <section>
              <h4>{strongsCode}</h4>
              {strongsDef.map(([key, value]) => {
                return (
                  <p key={key}>
                    <h3>{`${key}: `}</h3>
                    <h2>{`${value}`}</h2>
                  </p>
                );
              })}
              <h4>{strongsCode}</h4>
              {strongsDef.map(([key, value]) => {
                return (
                  <p key={key}>
                    <h3>{`${key}: `}</h3>
                    <h2>{`${value}`}</h2>
                  </p>
                );
              })}
            </section>{" "}
          </div>
        )}
      </CardBody>
    </Card>
  );
};
