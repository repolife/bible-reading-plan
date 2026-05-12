import React from "react";
import {
  Input,
  Popover,
  Typography,
} from "@material-tailwind/react";
import { format } from "date-fns";
import { DayPicker } from "react-day-picker";
import { ChevronRightIcon, ChevronLeftIcon } from "@heroicons/react/24/outline";

export const DateTimePicker = ({ 
  date, 
  time, 
  onDateTimeChange, 
  label = "Select Date",
  disabled = false
}) => {
  const [dateDate, setDateDate] = React.useState(date);

  React.useEffect(() => {
    if (date) {
      setDateDate(new Date(date));
    }
  }, [date]);

  const handleDaySelect = (selectedDate) => {
    if (!selectedDate) return;
    setDateDate(selectedDate);
    // If we have a time, preserve it, otherwise default to current time or 00:00
    const currentTime = time || "00:00";
    onDateTimeChange(selectedDate, currentTime);
  };

  const handleTimeChange = (e) => {
    const newTime = e.target.value;
    onDateTimeChange(dateDate, newTime);
  };

  return (
    <div className="w-full">
      <Popover placement="bottom">
        <Popover.Trigger>
          <Input
            label={label}
            color="blue-gray"
            onChange={() => null}
            value={dateDate ? format(dateDate, "PPP") : ""}
            disabled={disabled}
            className="cursor-pointer"
          />
        </Popover.Trigger>
        <Popover.Content className="z-[9999] p-0">
          <div className="p-4 border-b border-blue-gray-50">
            <DayPicker
              mode="single"
              selected={dateDate}
              onSelect={handleDaySelect}
              showOutsideDays
              className="border-0"
              classNames={{
                caption: "flex justify-center py-2 mb-4 relative items-center",
                caption_label: "text-sm font-medium text-gray-900",
                nav: "flex items-center",
                nav_button:
                  "h-6 w-6 bg-transparent hover:bg-blue-gray-50 p-1 rounded-md transition-colors duration-300",
                nav_button_previous: "absolute left-1.5",
                nav_button_next: "absolute right-1.5",
                table: "w-full border-collapse",
                head_row: "flex font-medium text-gray-900",
                head_cell: "m-0.5 w-9 font-normal text-sm",
                row: "flex w-full mt-2",
                cell: "text-gray-600 rounded-md h-9 w-9 text-center text-sm p-0 m-0.5 relative [&:has([aria-selected].day-range-end)]:rounded-r-md [&:has([aria-selected].day-outside)]:bg-gray-900/20 [&:has([aria-selected])]:bg-gray-900/50 first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20",
                day: "h-9 w-9 p-0 font-normal",
                day_range_end: "day-range-end",
                day_selected:
                  "rounded-md bg-gray-900 text-white hover:bg-gray-900 hover:text-white focus:bg-gray-900 focus:text-white",
                day_today: "rounded-md bg-gray-200 text-gray-900",
                day_outside:
                  "day-outside text-gray-500 opacity-50 aria-selected:bg-gray-500 aria-selected:text-gray-900 aria-selected:bg-opacity-10",
                day_disabled: "text-gray-500 opacity-50",
                day_hidden: "invisible",
              }}
              components={{
                IconLeft: ({ ...props }) => (
                  <ChevronLeftIcon {...props} className="h-4 w-4 stroke-2" />
                ),
                IconRight: ({ ...props }) => (
                  <ChevronRightIcon {...props} className="h-4 w-4 stroke-2" />
                ),
              }}
            />
            <div className="mt-4 flex items-center justify-center gap-2">
                <Typography variant="small" color="blue-gray" className="font-medium">
                    Time:
                </Typography>
                <input
                    type="time"
                    value={time}
                    onChange={handleTimeChange}
                    className="rounded-md border border-blue-gray-200 px-3 py-1.5 text-sm text-blue-gray-700 outline outline-0 transition-all focus:border-gray-900 focus:outline-0 disabled:border-0 disabled:bg-blue-gray-50"
                />
            </div>
          </div>
        </Popover.Content>
      </Popover>
    </div>
  );
};
