import { useState, useMemo, useRef } from "react";
import readingPlan from "data/bible_plan.json";
import { ReadingItem } from "../ReadingItem/ReadingItem";
import { ErrorBoundary } from "react-error-boundary";
import { MonthlyEventsPreview } from "@components/Calendar/MonthlyEventsPreview";
import { WeeklyPrayerRequests } from "../../PrayerRequest/WeeklyPrayerRequests";

export const FilteredReadingPlan = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const dateInputRef = useRef(null);

  const getStartOfWeek = (date) => {
    const d = new Date(date);
    const diff = d.getDate() - d.getDay();
    return new Date(d.setDate(diff));
  };

  const getEndOfWeek = (date) => {
    const start = getStartOfWeek(date);
    return new Date(start.setDate(start.getDate() + 6));
  };

  const startOfWeek = getStartOfWeek(selectedDate);
  const endOfWeek = getEndOfWeek(selectedDate);
  const isShabbat = endOfWeek.getDay() === new Date().getDay();

  const weeklyReadings = useMemo(() => {
    if (!readingPlan?.length) return [];
    return readingPlan.filter((entry) => {
      const entryDate = new Date(entry.date);
      return entryDate >= startOfWeek && entryDate <= endOfWeek;
    });
  }, [selectedDate]);

  const fmt = (d) =>
    d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  const dateRange = `${fmt(getStartOfWeek(selectedDate))} – ${fmt(getEndOfWeek(selectedDate))}`;

  return (
    <div className="px-4 py-5 space-y-5 max-w-lg mx-auto">
      <MonthlyEventsPreview />

      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[22px] font-bold text-[#0b2020]">Reading Plan</h1>
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="#0e9496" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
        </svg>
      </div>

      {/* Date picker */}
      <div
        className="relative flex items-center justify-between bg-white border border-[#c8e8e9] rounded-xl px-4 py-3 cursor-pointer"
        onClick={() => dateInputRef.current?.showPicker()}
      >
        <span className="text-sm font-medium text-[#0b2020]">{dateRange}</span>
        <input
          ref={dateInputRef}
          type="date"
          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
        />
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="#0e9496" className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
        </svg>
      </div>

      {isShabbat && (
        <p className="text-center text-[#0e9496] font-semibold">Shabbat Shalom! 🎺</p>
      )}

      {/* Readings */}
      {weeklyReadings.length > 0 ? (
        <div className="space-y-2">
          {weeklyReadings.map((reading, index) =>
            reading.passage
              ? reading.passage.split("; ").map((passage, i) => (
                  <ErrorBoundary key={`${index}-${i}`} FallbackComponent={() => null}>
                    <ReadingItem key={`${index}-${i}`} passage={passage} />
                  </ErrorBoundary>
                ))
              : null
          )}
        </div>
      ) : (
        <p className="text-center text-[#3d6e70] text-sm py-6">No readings scheduled for this week.</p>
      )}

      {/* YouVersion links */}
      <div className="space-y-3 pt-2">
        <p className="text-center text-xs text-[#3d6e70]">Listen on mobile via YouVersion</p>
        <div className="flex gap-3 justify-center">
          <a
            href="https://play.google.com/store/apps/details?id=com.sirma.mobile.bible.android&hl=en_US"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#0e9496] text-white text-sm font-semibold px-4 py-2.5 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M3.18 23.76c.3.17.64.24.99.19l12.6-7.27-2.79-2.79L3.18 23.76zm16.5-10.64L16.6 11l-3.07 3.07 3.07 3.07 3.1-1.79a1.5 1.5 0 0 0 0-2.23zM4.17.05A1.5 1.5 0 0 0 3 1.46v21.08l11-11L4.17.05zm8.29 8.87L4.17.05l10.43 6.02-2.14 2.85z"/>
            </svg>
            Android
          </a>
          <a
            href="https://app.bible.com/app-ios"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-[#0e9496] text-white text-sm font-semibold px-4 py-2.5 rounded-full"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="currentColor" viewBox="0 0 24 24" className="w-4 h-4">
              <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
            </svg>
            iOS
          </a>
        </div>
        <div className="flex justify-center">
          <a href="/plan" className="flex items-center gap-1 text-sm text-[#0e9496] font-medium">
            View full 2-year reading plan
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
            </svg>
          </a>
        </div>
      </div>

      <WeeklyPrayerRequests />
    </div>
  );
};
