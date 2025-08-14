import { Link } from "react-router";
import { cn } from "../lib/utils";

const Footer = ({ className }) => {
  const links = [
    { title: "Privacy Policy", url: "" },
    { title: "Terms of Service", url: "" },
    { title: "Fees", url: "" },
  ];
  return (
    <footer className={cn("mt-8 w-full border-t p-5 text-sm", className)}>
      <div className="flex flex-col items-center md:flex-row md:items-stretch md:justify-between lg:mx-auto lg:max-w-3xl">
        <p className="mt-1 flex flex-col items-center md:mt-0 md:flex-row">
          <span>&copy; 2025 Moduls. All rights reserved.</span>
          <span className="md:ml-2">Made with ❤️ for SEI</span>
        </p>
        <div className="mt-1 flex w-full justify-center md:mt-0 md:w-auto">
          <ul className="flex gap-2 md:gap-3">
            {links.map((link, idx) => (
              <li key={idx}>
                <Link
                  to={link.url}
                  className="text-sm text-accent underline transition-colors duration-300 hover:text-accent"
                >
                  {link.title}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mt-1 text-justify lg:mx-auto lg:max-w-3xl">
        <div className="mr-1 inline-flex gap-1 text-amber-500">
          <span className="text-amber-500">Disclaimer:</span>
        </div>
        <span>
          Moduls is not responsible for any misbehavior or tokens launched on
          this platform. All tokens are created and managed by independent
          users. By creating or interacting with tokens on this platform, users
          acknowledge that they are responsible for their own actions and agree
          to use the platform at their own risk.
        </span>
      </div>
    </footer>
  );
};

export default Footer;
