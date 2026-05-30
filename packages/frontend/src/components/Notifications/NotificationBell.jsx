import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { BellIcon } from "@heroicons/react/24/outline";
import { useAuthStore } from "@store/useAuthStore";
import { useProfileStore } from "@store/useProfileStore";
import { useNotificationsStore } from "@store/useNotificationsStore";

const RSVP_TEXT = {
  yes: "is attending",
  maybe: "might attend",
  no: "is not attending",
};

const timeAgo = (iso) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export const NotificationBell = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthStore();
  const { profile } = useProfileStore();
  const familyId = profile?.family_id;

  const notifications = useNotificationsStore((s) => s.notifications);
  const unread = useNotificationsStore((s) => s.unreadCount());
  const init = useNotificationsStore((s) => s.init);
  const teardown = useNotificationsStore((s) => s.teardown);
  const markRead = useNotificationsStore((s) => s.markRead);
  const markAllRead = useNotificationsStore((s) => s.markAllRead);

  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Subscribe while authenticated with a family; tear down otherwise.
  useEffect(() => {
    if (isAuthenticated && familyId) {
      init(familyId);
    } else {
      teardown();
    }
  }, [isAuthenticated, familyId, init, teardown]);

  // Close the panel on outside click.
  useEffect(() => {
    if (!open) return;
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  if (!isAuthenticated || !familyId) return null;

  const handleOpen = (n) => {
    markRead(n.id);
    setOpen(false);
    if (n.event_id) navigate(`/events/${n.event_id}`);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative flex items-center justify-center w-9 h-9 rounded-md text-white/90 hover:bg-white/10 transition-colors"
      >
        <BellIcon className="w-6 h-6" />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-red-500 text-white text-[11px] font-bold leading-none">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-gray-800 rounded-lg shadow-xl ring-1 ring-black/5 z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-gray-100 dark:border-gray-700">
            <span className="font-semibold text-gray-800 dark:text-gray-100 text-sm">
              Notifications
            </span>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-[#0e9496] hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-gray-400">
                No notifications yet.
              </p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleOpen(n)}
                  className={`w-full text-left px-4 py-3 border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                    n.is_read ? "" : "bg-[#0e9496]/5"
                  }`}
                >
                  <p className="text-sm text-gray-800 dark:text-gray-100">
                    <span className="font-semibold">
                      The {n.actor_family_name || "A"} family
                    </span>{" "}
                    {RSVP_TEXT[n.rsvp_status] || "responded"}
                    {n.event_title ? (
                      <>
                        {" "}
                        <span className="font-medium">{n.event_title}</span>
                      </>
                    ) : null}
                    .
                  </p>
                  <span className="text-xs text-gray-400">
                    {timeAgo(n.created_at)}
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};
