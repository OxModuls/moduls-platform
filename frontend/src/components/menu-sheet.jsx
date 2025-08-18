import {
  ArrowUpRight,
  CircleQuestionMark,
  Coins,
  FileText,
  Home,
  X,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "./ui/sheet";
import { FaXTwitter } from "react-icons/fa6";
import { FaTelegramPlane } from "react-icons/fa";
import { Fragment } from "react/jsx-runtime";
import { Link, useLocation } from "react-router";
import { Separator } from "./ui/separator";

const majorItems = [
  {
    title: "Home",
    url: "/",
    icon: Home,
  },
  {
    title: "Launch Agent",
    url: "/create",
    icon: ArrowUpRight,
  },
  {
    title: "How it works",
    url: "#",
    icon: CircleQuestionMark,
  },
  {
    title: "Fees",
    url: "#",
    icon: Coins,
  },
];

const minorItems = [
  {
    title: "Document",
    url: "#",
    icon: FileText,
  },
  {
    title: "Join Telegram",
    url: "#",
    icon: FaTelegramPlane,
  },
  {
    title: "Follow Twitter",
    url: "https://x.com/modulsdotfun",
    icon: FaXTwitter,
  },
];

const MenuSheet = ({ open, onOpenChange }) => {
  const pathname = useLocation().pathname;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent showCloseButton={false} className="px-6 py-4">
        <SheetHeader className="sr-only">
          <SheetTitle>Menu sidebar</SheetTitle>
          <SheetDescription></SheetDescription>
        </SheetHeader>
        <div className="flex justify-end">
          <button
            onClick={() => onOpenChange(!open)}
            className="cursor-pointer hover:text-accent"
          >
            <X className="size-7" />
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {majorItems.map((item, idx, arr) => (
            <Fragment key={idx}>
              <Link
                to={item.url}
                className="group flex items-center gap-2 py-2"
                data-active={pathname === item.url}
                onClick={() => onOpenChange(!open)}
              >
                <item.icon className="size-5" />
                <span className="text-lg font-semibold group-hover:text-accent group-data-[active=true]:text-accent">
                  {item.title}
                </span>
              </Link>
              {idx + 1 < arr.length && <Separator orientation="horizontal" />}
            </Fragment>
          ))}
        </div>
        <div className="ml-4 flex flex-col gap-2 text-neutral-500">
          {minorItems.map((item, idx) => (
            <Fragment key={idx}>
              <Link
                to={item.url}
                className="group flex items-center gap-2 py-2"
                data-active={pathname === item.url}
                onClick={() => onOpenChange(!open)}
              >
                <item.icon className="size-5" />
                <span className="text-lg font-semibold group-hover:text-accent group-data-[active=true]:text-accent">
                  {item.title}
                </span>
              </Link>
            </Fragment>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default MenuSheet;
