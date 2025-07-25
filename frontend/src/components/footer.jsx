import { Link } from "react-router";

const Footer = () => {
  return (
    <footer className="w-full py-5 border-t flex flex-col items-center">
      <p className="text-sm">Made with  for the Sei AI Accelathon</p>
      <p className="mt-2 text-sm flex gap-2">
        <a
          href="moduls.fun"
          className="hover:text-accent transition-colors duration-300"
        >
          🔗 moduls.fun
        </a>
        <span>&copy; 2025</span>
      </p>
      <div className="mt-2 w-full flex justify-center">
        <ul className="flex gap-4">
          <li>
            <Link
              to=""
              className="text-sm hover:text-accent transition-colors duration-300"
            >
              X
            </Link>
          </li>
          <li>
            <Link
              to=""
              className="text-sm hover:text-accent transition-colors duration-300"
            >
              Github
            </Link>
          </li>
          <li>
            <Link
              to=""
              className="text-sm hover:text-accent transition-colors duration-300"
            >
              Docs
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  );
};

export default Footer; 