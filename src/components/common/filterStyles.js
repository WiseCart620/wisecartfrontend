// src/components/common/filterStyles.js
export const fieldBase =
    "h-9 box-border text-sm border border-gray-300 rounded-md bg-white text-gray-700 " +
    "placeholder-gray-400 transition-colors hover:border-gray-400 " +
    "focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500";

export const fieldPadded = `${fieldBase} px-3`;

export const dateBoxWrapper =
    "h-9 box-border flex items-center gap-1.5 border border-gray-300 rounded-md px-2.5 bg-white " +
    "hover:border-gray-400 transition-colors focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500";

export const dateInput =
    "w-[100px] h-full box-border bg-transparent text-sm border-0 p-0 focus:outline-none focus:ring-0 " +
    "[&::-webkit-calendar-picker-indicator]:h-3.5 [&::-webkit-calendar-picker-indicator]:w-3.5 [&::-webkit-calendar-picker-indicator]:opacity-50";