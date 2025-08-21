import { useState } from "react";
import {
  Button,
  Card,
  Collapse,
  Typography,
} from "@material-tailwind/react";
import { useEffect } from "react";
import { useAuthStore } from "@store/useAuthStore";
import { supabase } from "@/supabaseClient";
import { useNavigate } from "react-router-dom";
import { CalendarPlus } from "iconoir-react";

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
      <Typography
        as="a"
        href="/"
        variant="small"
        color="foreground"
        className="flex items-center gap-x-2 p-1 font-medium"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25"
          />
        </svg>
        Reading Plan
      </Typography>
      <Typography
        as="a"
        href="/songs"
        variant="small"
        color="foreground"
        className="flex items-center gap-x-2 p-1 font-medium"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="size-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m9 9 10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z"
          />
        </svg>
        Songs
      </Typography>

      {isAuthenticated ? (
        <>
          <Typography
            as="a"
            href="/account"
            variant="small"
            color="foreground"
            className="flex items-center gap-x-2 p-1 font-medium"
          >
            <svg
              width="16"
              height="17"
              viewBox="0 0 16 17"
              className="size-6"
              fill="none"
              strokeWidth={1.5}
              stroke="currentColor"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="round"
                clipRule="round"
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M16 8.5C16 10.6217 15.1571 12.6566 13.6569 14.1569C12.1566 15.6571 10.1217 16.5 8 16.5C5.87827 16.5 3.84344 15.6571 2.34315 14.1569C0.842855 12.6566 0 10.6217 0 8.5C0 6.37827 0.842855 4.34344 2.34315 2.84315C3.84344 1.34285 5.87827 0.5 8 0.5C10.1217 0.5 12.1566 1.34285 13.6569 2.84315C15.1571 4.34344 16 6.37827 16 8.5ZM10 5.5C10 6.03043 9.78929 6.53914 9.41421 6.91421C9.03914 7.28929 8.53043 7.5 8 7.5C7.46957 7.5 6.96086 7.28929 6.58579 6.91421C6.21071 6.53914 6 6.03043 6 5.5C6 4.96957 6.21071 4.46086 6.58579 4.08579C6.96086 3.71071 7.46957 3.5 8 3.5C8.53043 3.5 9.03914 3.71071 9.41421 4.08579C9.78929 4.46086 10 4.96957 10 5.5ZM8 9.5C7.0426 9.49981 6.10528 9.77449 5.29942 10.2914C4.49356 10.8083 3.85304 11.5457 3.454 12.416C4.01668 13.0706 4.71427 13.5958 5.49894 13.9555C6.28362 14.3152 7.13681 14.5009 8 14.5C8.86319 14.5009 9.71638 14.3152 10.5011 13.9555C11.2857 13.5958 11.9833 13.0706 12.546 12.416C12.147 11.5457 11.5064 10.8083 10.7006 10.2914C9.89472 9.77449 8.9574 9.49981 8 9.5Z"
                fill="#90A4AE"
              />
            </svg>
            Account
          </Typography>
          <Button as="a" href="/calendar" className="bg-primaryhover:bg-brand-600 text-white px-4 py-2 rounded-lg font-medium transition-colors duration-200 flex items-center gap-x-2">
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

export default Nav;
