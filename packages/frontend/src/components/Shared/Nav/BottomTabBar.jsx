import { useLocation, useNavigate } from "react-router-dom";
import { useAuthStore } from "@store/useAuthStore";

const tabs = [
  {
    label: "Readings",
    path: "/",
    icon: (active) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.8} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
      </svg>
    ),
  },
  {
    label: "Songs",
    path: "/songs",
    icon: (active) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.8} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 9l10.5-3m0 6.553v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 1 1-.99-3.467l2.31-.66a2.25 2.25 0 0 0 1.632-2.163Zm0 0V2.25L9 5.25v10.303m0 0v3.75a2.25 2.25 0 0 1-1.632 2.163l-1.32.377a1.803 1.803 0 0 1-.99-3.467l2.31-.66A2.25 2.25 0 0 0 9 15.553Z" />
      </svg>
    ),
  },
  {
    label: "Calendar",
    path: "/calendar",
    auth: true,
    icon: (active) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.8} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    label: "Directory",
    path: "/directory",
    auth: true,
    icon: (active) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.8} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
      </svg>
    ),
  },
  {
    label: "Account",
    path: "/account",
    auth: true,
    icon: (active) => (
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={active ? 2.5 : 1.8} stroke="currentColor" className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
  },
];

export const BottomTabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();

  const hiddenPaths = ["/login", "/signup", "/profile"];
  if (hiddenPaths.includes(location.pathname)) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#c8e8e9] flex h-16 shrink-0 z-50">
      {tabs.map((tab) => {
        const isActive =
          tab.path === "/" ? location.pathname === "/" : location.pathname.startsWith(tab.path);
        const color = isActive ? "#0e9496" : "#3d6e70";

        const handlePress = () => {
          if (tab.auth && !isAuthenticated) {
            navigate("/login");
          } else {
            navigate(tab.path);
          }
        };

        return (
          <button
            key={tab.path}
            onClick={handlePress}
            className="flex-1 flex flex-col items-center justify-center gap-0.5"
            style={{ color }}
          >
            {tab.icon(isActive)}
            <span className={`text-[11px] ${isActive ? "font-semibold" : "font-medium"}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
