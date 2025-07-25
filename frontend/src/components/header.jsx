import { FaTelegram, FaXTwitter } from "react-icons/fa6";
import { Input } from "./ui/input";
import { Search } from "lucide-react";
import { Link } from "react-router";
import { useLocation } from "react-router";
import modulsLogo from "../assets/moduls-logo.svg";

import ConnectWalletButton from "./connect-wallet-button";

const Header = () => {
  const pathname = useLocation().pathname;

  return (
    <header className="px-4 pb-4 w-full">
      <div className="py-4 flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Link to="/" className="flex gap-2 items-center">
            <img src={modulsLogo} alt="Moduls Logo" className="h-10" />
          </Link>
          <div className="ml-2 flex gap-2 items-center">
            <a href="" target="_blank">
              <FaTelegram className="size-5" />
            </a>
            <a href="" target="_blank">
              <FaXTwitter className="size-5" />
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden px-2 relative md:block">
            <Input
              type="search"
              placeholder="Search token..."
              className="pl-8"
            />
            <Search className="size-4 absolute top-[50%] translate-y-[-50%] left-4" />
          </div>
          <ConnectWalletButton />
        </div>
      </div>
      {pathname === "/" && (
        <div className="px-2 relative md:hidden">
          <Input type="search" placeholder="Search token..." className="pl-8" />
          <Search className="size-4 absolute top-[50%] translate-y-[-50%] left-4" />
        </div>
      )}
    </header>
  );
};

export default Header; 