import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { formatDistanceToNow, parseISO } from "date-fns";
import { enGB } from "date-fns/locale";
import { toast } from "sonner";

export function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function ellipsizeAddress(
    address,
    charsAtStart = 6,
    charsAtEnd = 6,
    ellipsis = "..."
) {
    if (address.length <= charsAtStart * 2 + ellipsis.length) {
        return address;
    }
    const start = address.substring(0, charsAtStart);
    const end = address.substring(address.length - charsAtEnd);
    return `${start}${ellipsis}${end}`;
}

export function formatISODate(isoString) {
    const date = new Date(isoString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    const seconds = String(date.getSeconds()).padStart(2, "0");
    return `${day}/${month}/${year}, ${hours}:${minutes}:${seconds}`;
}

export function getHumanReadableTimeAgo(isoString, locale = enGB) {
    const date = parseISO(isoString);
    return formatDistanceToNow(date, {
        addSuffix: true,
        locale: locale,
    });
}

export const writeToClipboard = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        toast.success("Copied to clipboard");
    } catch (error) {
        toast.error(error.message);
    }
}; 

export function formatBigIntToUnits(rawValue, decimals) {
  if (decimals === 0) {
    return rawValue.toString();
  }

  const divisor = BigInt(10) ** BigInt(decimals);
  const wholeUnits = rawValue / divisor;
  let fractionalPart = rawValue % divisor;

  let fractionalString = fractionalPart.toString().padStart(decimals, "0");
  fractionalString = fractionalString.replace(/0+$/, "");

  if (fractionalString === "") {
    fractionalString = "0";
  }

  return `${wholeUnits.toString()}.${fractionalString}`
    .replace(/\.0+$/, "")
    .replace(/\.$/, "");
}
