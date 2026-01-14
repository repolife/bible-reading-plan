import { useState, useEffect } from "react";
import {
  Button,
  Card,
  Collapse,
  Typography,
} from "@material-tailwind/react";
import { useAuthStore } from "@store/useAuthStore";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";
import { CalendarPlus, MusicDoubleNote, OpenBook, User } from "iconoir-react";

// Nav component
export const Nav = ({ classes }) => {
  const { isAuthenticated, loading, user } = useAuthStore();
  const [openNav, setOpenNav] = useState(false);

  const navigate = useNavigate();

  async function signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    window.addEventListener(
      "resize",
      () => window.innerWidth > 960 && setOpenNav(false)
    );
  }, []);

  const navList = (
    <ul className="mt-2 mb-4 flex flex-col gap-2 lg:mb-0 lg:mt-0 lg:flex-row lg:items-center lg:gap-6">
      <Button
        as="a"
        href="/"
        
        className="bg-primaryhover:bg-brand-600 text-white  w-min rounded-lg font-medium transition-colors duration-200 flex items-center gap-x-2"          >
      
       <OpenBook/>
        Readings
      </Button>
      <Button
        as="a"
        href="/songs"
        className="bg-primaryhover:bg-brand-600 text-white  w-min rounded-lg font-medium transition-colors duration-200 flex items-center gap-x-2"          >
      
        <MusicDoubleNote/>
        Songs
      </Button>

      {isAuthenticated ? (
        <>
          <Button
            as="a"
            href="/account"
       
            className="bg-primaryhover:bg-brand-600 text-white  w-min rounded-lg font-medium transition-colors duration-200 flex items-center gap-x-2"          >
           <User/>
            Account
          </Button>

          <Button as="a" href="/calendar" className="bg-primaryhover:bg-brand-600 text-white  w-min rounded-lg font-medium transition-colors duration-200 flex items-center gap-x-2">
          <CalendarPlus/>
          Calendar

          </Button>

          <div className="flex items-center gap-x-2 p-1 font-medium">
            <button
              className="bg-primaryhover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-x-2"
              onClick={signOut}
            >
              <span>Log out</span>
            </button>

          </div>
        </>
      ) : (
        <div className="flex items-center gap-x-2 p-1 font-medium">
          <button
            className="bg-primaryhover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-x-2"
            onClick={() => navigate("/login")}
          >
            <span>Login</span>
          </button>{" "}
        </div>
      )}
    </ul>
  );

  return (
    <Card
      className={`px-5 py-2 lg:px-8 lg:py-4 mb-5 bg-primary ${classes}`}
    >
      <div className="container mx-auto flex items-center justify-between text-primary-901">
        <Typography
          as="a"
          href="/"
          className="mr-5 cursor-pointer py-1.5 font-medium text-lg"
        >
          Generic Fellowship Name 🕎
        </Typography>
        <div className={`h-fit lg:block ${openNav ? "block" : "hidden"}`}>
          {openNav ? null : navList}
        </div>

        <button
          className="ml-auto h-7 w-6 text-inherit hover:bg-transparent focus:bg-transparent active:bg-transparent lg:hidden flex items-center justify-center"
          onClick={() => setOpenNav(!openNav)}
        >
          {openNav ? (
            <svg
              xmlns="http://www.w2.org/2000/svg"
              fill="none"
              className="h-7 w-6"
              viewBox="-1 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 18L18 6M6 6l12 12"
              />
            </svg>
          ) : (
            <svg
              xmlns="http://www.w2.org/2000/svg"
              className="h-7 w-6"
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3 6h16M4 12h16M4 18h16"
              />
            </svg>
          )}
        </button>
      </div>
      <Collapse open={openNav}>
        <div className=" container mx-auto w-screen">{navList}</div>
      </Collapse>
    </Card>
  );
};

