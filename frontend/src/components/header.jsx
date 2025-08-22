import { Link } from "react-router";
import { useLocation } from "react-router";
import modulsLogo from "../assets/moduls-logo.svg";

import ConnectWalletButton from "./connect-wallet-button";
import SearchBar from "./search-bar";
import { Menu } from "lucide-react";
import { useState } from "react";
import MenuSheet from "./menu-sheet";
import { cn } from "../lib/utils";
import { FaTelegramPlane } from "react-icons/fa";
import { FaXTwitter } from "react-icons/fa6";
import { twitterUrl } from "@/shared/constants";

const headerLinks = [
  { title: "Launch Agent", url: "/create" },
  { title: "How it works", url: "#" },
  { title: "Fees", url: "#" },
];

const Header = ({ className }) => {
  const pathname = useLocation().pathname;
  const [menuSheetOpen, setMenuSheetOpen] = useState(false);

  return (
    <header className={cn("w-full px-4 pb-4", className)}>
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center">
          <Link to="/" className="flex items-center gap-2">
            <img src={modulsLogo} alt="Moduls Logo" className="h-10" />
          </Link>
          <div className="ml-10 hidden items-center gap-4 lg:flex">
            {headerLinks.map((link, idx) => (
              <Link
                key={idx}
                to={link.url}
                data-active={pathname === link.url}
                className="group relative py-0.5 after:absolute after:bottom-0 after:left-0 after:h-0.5 after:w-full after:rounded-lg after:bg-accent after:content-[''] data-[active=false]:after:hidden"
              >
                <span className="font-bold group-hover:text-accent group-data-[active=true]:text-accent">
                  {link.title}
                </span>
              </Link>
            ))}
            <Link to={"#"} target="_blank" className="hover:text-accent">
              <FaTelegramPlane className="size-5" />
            </Link>
            <Link to={twitterUrl} target="_blank" className="hover:text-accent">
              <FaXTwitter className="size-5" />
            </Link>
          </div>
          <ul className="ml-4 hidden items-center gap-4 lg:flex"></ul>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden w-80 md:block">
            <SearchBar placeholder="Search agents, tokens..." />
          </div>
          <ConnectWalletButton />
          <button
            onClick={() => setMenuSheetOpen((prev) => !prev)}
            className="cursor-pointer lg:hidden"
          >
            <Menu className="size-7" />
          </button>
        </div>
      </div>
      {pathname === "/" && (
        <div className="px-2 md:hidden">
          <SearchBar placeholder="Search agents, tokens..." />
        </div>
      )}
      <MenuSheet open={menuSheetOpen} onOpenChange={setMenuSheetOpen} />
    </header>
  );
};

export default Header;
