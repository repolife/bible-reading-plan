import * as MT from "@material-tailwind/react";
console.log("Keys:", Object.keys(MT));
console.log("Popover:", MT.Popover);
try {
    console.log("Popover.Handler:", MT.Popover?.Handler);
    console.log("Popover.Content:", MT.Popover?.Content);
} catch (e) {
    console.log("Error accessing Popover subcomponents:", e.message);
}
