import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@store/useAuthStore";

const navLinks = [
  { label: "Readings", path: "/" },
  { label: "Songs", path: "/songs" },
  { label: "Calendar", path: "/calendar", auth: true },
  { label: "Directory", path: "/directory", auth: true },
  { label: "Files", path: "/files", auth: true },
];

export const Nav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const hiddenPaths = ["/login", "/signup", "/profile"];
  if (hiddenPaths.includes(location.pathname)) return null;

  const handleNav = (link) => {
    if (link.auth && !isAuthenticated) {
      navigate("/login");
    } else {
      navigate(link.path);
    }
  };

  return (
    <div className="bg-[#0e9496] px-5 h-14 flex items-center justify-between shrink-0">
      <span className="text-white font-bold text-lg">Fellowship 🕎</span>

      {/* Desktop nav links */}
      <nav className="hidden md:flex items-center gap-1">
        {navLinks.map((link) => {
          const isActive =
            link.path === "/"
              ? location.pathname === "/"
              : location.pathname.startsWith(link.path);
          return (
            <button
              key={link.path}
              onClick={() => handleNav(link)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? "bg-white/20 text-white"
                  : "text-white/80 hover:bg-white/10 hover:text-white"
              }`}
            >
              {link.label}
            </button>
          );
        })}

        <button
          onClick={() =>
            isAuthenticated ? navigate("/account") : navigate("/login")
          }
          className={`ml-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
            location.pathname === "/account"
              ? "bg-white/20 text-white"
              : "text-white/80 hover:bg-white/10 hover:text-white"
          }`}
        >
          {isAuthenticated ? "Account" : "Sign In"}
        </button>
      </nav>
    </div>
  );
};
