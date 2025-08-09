import { FaTelegram, FaXTwitter } from "react-icons/fa6";
import { Link } from "react-router";
import { useLocation } from "react-router";
import modulsLogo from "../assets/moduls-logo.svg";

import ConnectWalletButton from "./connect-wallet-button";
import SearchBar from "./search-bar";

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
          <div className="hidden md:block w-80">
            <SearchBar placeholder="Search agents, tokens..." />
          </div>
          <ConnectWalletButton />
        </div>
      </div>
      {pathname === "/" && (
        <div className="px-2 md:hidden">
          <SearchBar placeholder="Search agents, tokens..." />
        </div>
      )}
    </header>
  );
};

export default Header;
