import { Link } from "react-router";
import { useLocation } from "react-router";
import modulsLogo from "../assets/moduls-logo.svg";

import ConnectWalletButton from "./connect-wallet-button";
import SearchBar from "./search-bar";
import { Menu } from "lucide-react";
import { useState } from "react";
import MenuSheet from "./menu-sheet";
import { cn } from "../lib/utils";

const Header = ({ className }) => {
  const pathname = useLocation().pathname;
  const [menuSheetOpen, setMenuSheetOpen] = useState(false);

  return (
    <header className={cn("w-full px-4 pb-4", className)}>
      <div className="flex items-center justify-between py-4">
        <div className="flex items-center gap-2">
          <Link to="/" className="flex items-center gap-2">
            <img src={modulsLogo} alt="Moduls Logo" className="h-10" />
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden w-80 md:block">
            <SearchBar placeholder="Search agents, tokens..." />
          </div>
          <ConnectWalletButton />
          <button
            onClick={() => setMenuSheetOpen((prev) => !prev)}
            className="cursor-pointer"
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
