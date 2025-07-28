import { Brain, Home, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router";

const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center max-w-md mx-auto">
        {/* Icon */}
        <div className="relative mb-8">
          <div className="size-24 bg-accent/20 rounded-3xl flex items-center justify-center mx-auto animate-pulse">
            <Brain className="size-12 text-accent" />
          </div>
          <div className="absolute inset-0 border-2 border-accent/30 rounded-3xl animate-ping"></div>
        </div>

        {/* 404 Number */}
        <div className="mb-6">
          <h1 className="text-8xl font-bold text-foreground/20 mb-2">404</h1>
          <div className="w-16 h-1 bg-accent mx-auto rounded-full"></div>
        </div>

        {/* Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-foreground mb-3">
            Page Not Found
          </h2>
          <p className="text-muted-foreground mb-4">
            The page you're looking for doesn't exist or has been moved to a different location.
          </p>
          <p className="text-sm text-muted-foreground">
            Don't worry, even the smartest agents sometimes get lost in the digital realm.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => navigate(-1)}
            className="px-6 py-3 bg-accent/10 text-accent rounded-lg hover:bg-accent/20 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <ArrowLeft className="size-4" />
            Go Back
          </button>
          
          <Link
            to="/"
            className="px-6 py-3 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors flex items-center justify-center gap-2 font-medium"
          >
            <Home className="size-4" />
            Go Home
          </Link>
        </div>

        {/* Additional Help */}
        <div className="mt-8 pt-6 border-t border-border/50">
          <p className="text-xs text-muted-foreground">
            If you believe this is an error, please{" "}
            <a 
              href="mailto:support@moduls.fun" 
              className="text-accent hover:underline"
            >
              contact support
            </a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
