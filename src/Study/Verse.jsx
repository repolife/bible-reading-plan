import { useState, useCallback, useMemo } from "react";
import { useQuery } from "react-query";
import axios from "axios";
import "./bible.css";
import hebrewDef from "../../hebrew.json";
import testament from "../../testament.json";
import greek from "../../greek.json";
import { useParams } from "react-router-dom";
import { Badge, Card, CardHeader, CardBody, Typography } from "@material-tailwind/react";

export const Verse = () => {
  const [strongsCode, setStrongsCode] = useState("");
  const [strongsNumber, setStrongsNumber] = useState("");
  const [dataText, setDataText] = useState("");
  const [strongsObject, setStrongsObject] = useState(undefined);

  let { book, chapter, verse } = useParams();

  let formatedBook = book.charAt(0).toLocaleUpperCase() + book.slice(1);

  const bibleQuery = `/search/verses-w-strongs.php? `;

  const url = `https://jsonbible.com/search/verses-w-strongs.php?json={ "book": "${formatedBook}",  "chapter": "${chapter}", "verse": "${verse}", "found": 1, "next_chapter": "read-joh-4" }`;

  const { data, isPending, isError, error } = useQuery({
    queryKey: ["todos"],
    enabled: (book && chapter && verse) !== undefined,
    queryFn: async () => {
      const res = await axios.get(url);
      return res.data;
    },
  });

  const filteredTestament = useMemo(() => {
    if (!data) return;
    if (data.book === undefined) return;
    if (!testament) return;

    const filteredBook = testament.filter((t) => t.book.toLocaleLowerCase() === data.book.toLocaleLowerCase());
    return filteredBook[0].testament;
  }, [data, testament, book]);

  let handleStrongsDef = (strongsCode, word) => {
    if (strongsCode === "" || strongsCode === undefined) return;
    setStrongsNumber(strongsCode);
  };

  const renderVerseText = (text) => {
    const regex = /\[data strongs="(\d+)"\](.*?)\[\/data\]/g;
    const parts = [];

    let lastIndex = 0;
    text.replace(regex, (match, p1, p2, offset) => {
      parts.push(text.slice(lastIndex, offset));
      parts.push(
        <Badge
          className="text-xs"
          // content={`${strongsCode}${p1}`}
          color="blue-gray"
          key={offset}
          onClick={() => handleStrongsDef(p1, p2)}
          data-strongs={p1}
          children={<Typography className="text-xl"> {p2}</Typography>}
        />
      );
      lastIndex = offset + match.length;
    });

    parts.push(text.slice(lastIndex));

    return parts;
  };

  const strongsDef = useMemo(() => {
    if (strongsNumber === undefined) return undefined;
    if (!filteredTestament) return undefined;

    let strongsObj = undefined;

    if (filteredTestament === "OT") {
      let hebrewCode = `H${strongsNumber}`;

      setStrongsCode(hebrewCode);
      strongsObj = hebrewDef[hebrewCode];
    }

    if (filteredTestament === "NT") {
      let greekCode = `G${strongsNumber}`;

      setStrongsCode(greekCode);

      strongsObj = greek[greekCode];
    }

    if (strongsObj !== undefined) return Object.entries(strongsObj);
  }, [strongsNumber, filteredTestament]);

  if (!data) {
    return <h2>no</h2>;
  }

  return (
    <Card>
      <CardBody>
        <Typography variant="h4">
          {data.book} {data.chapter}:{data.verses} ({data.version})
        </Typography>
        <Typography className="text-2xl pt-4"> {renderVerseText(data.text)}</Typography>
        <br />

        {strongsDef && strongsDef.length > 0 && (
          <div>
            <h4>{strongsCode}</h4>
            {strongsDef.map(([key, value]) => {
              console.log(value);
              return (
                <p key={key}>
                  <span>{`${key}: `}</span>
                  <span>{`${value}`}</span>
                </p>
              );
            })}
          </div>
        )}
      </CardBody>
    </Card>
  );
};

/*https://jsonbible.com/search/ref.php?keyword=jn 3:16
https://jsonbible.com/search/verses-w-strongs.php?&keyword=jn+3
*/
