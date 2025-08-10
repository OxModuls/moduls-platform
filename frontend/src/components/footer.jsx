import { TriangleAlert } from "lucide-react";
import { Link } from "react-router";
import { cn } from "../lib/utils";

const Footer = ({ className }) => {
  const links = [
    { title: "Privacy Policy", url: "" },
    { title: "Terms of Service", url: "" },
    { title: "Fees", url: "" },
  ];
  return (
    <div className={cn("", className)}>
      <div className="mt-8 mb-6 px-6">
        <div className="shadow-l mx-auto flex w-full max-w-lg items-start gap-2 rounded-2xl border p-6">
          <TriangleAlert className="size-6 shrink-0 text-amber-500" />
          <div>
            <p>
              <span className="text-amber-500">Disclaimer:</span>{" "}
              <span>
                Moduls is not responsible for any misbehavior or tokens launched
                on this platform. All tokens are created and managed by
                independent users.
              </span>
            </p>
            <p className="mt-1">
              By creating or interacting with tokens on this platform, users
              acknowledge that they are responsible for their own actions and
              agree to use the platform at their own risk.
            </p>
          </div>
        </div>
      </div>
      <footer className="w-full border-t p-5">
        <div className="flex flex-col items-center md:flex-row md:items-stretch md:justify-between lg:mx-auto lg:max-w-3xl">
          <p className="mt-2 flex flex-col items-center text-sm md:mt-0 md:flex-row">
            <span>&copy; 2025 Moduls. All rights reserved.</span>
            <span className="md:ml-2">Made with ❤️ for SEI</span>
          </p>
          <div className="mt-2 flex w-full justify-center md:mt-0 md:w-auto">
            <ul className="flex gap-2 md:gap-3">
              {links.map((link, idx) => (
                <li key={idx}>
                  <Link
                    to={link.url}
                    className="text-sm transition-colors duration-300 hover:text-accent"
                  >
                    {link.title}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Footer;

