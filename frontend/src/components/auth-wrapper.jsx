import { useAuth } from "../shared/hooks/useAuth";
import { Unplug } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useWalletModalStore } from "../shared/store";

const AuthWrapper = ({
  children,
  fallback = null,
  pageLevel = true,
  redirectUrl = null,
}) => {
  const { user, isAuthenticated, isLoading, error, authenticate } = useAuth();

  const { openWalletModal } = useWalletModalStore();
  const navigate = useNavigate();

  // Handle redirect on auth failure
  useEffect(() => {
    if (redirectUrl && error && !isAuthenticated) {
      navigate(redirectUrl);
    }
  }, [redirectUrl, error, isAuthenticated, navigate]);

  // Show themed loader while auth is pending
  if (isLoading) {
    const LoaderContent = () => (
      <div className="flex flex-col items-center gap-4">
        <div className="relative">
          <div className="size-40 bg-accent/20 rounded-2xl flex items-center justify-center animate-pulse">
            <Unplug className="size-24 text-accent" />
          </div>
          <div className="absolute inset-0 border-2 border-accent/30 rounded-2xl animate-ping"></div>
        </div>
        <div className="text-center">
          <p className="text-lg font-semibold text-foreground">
            Authenticating...
          </p>
          <p className="text-sm text-muted-foreground">
            Please wait while we verify your wallet
          </p>
        </div>
      </div>
    );

    if (pageLevel) {
      return (
        <div className="min-h-[calc(100vh-100px)] flex items-center justify-center bg-background">
          <LoaderContent />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center p-8">
        <LoaderContent />
      </div>
    );
  }

  // Show fallback if provided and not authenticated
  if (!isAuthenticated && fallback) {
    return fallback;
  }

  // Show error state if not authenticated (wallet disconnected or auth failed)
  if (!isAuthenticated) {
    const ErrorContent = () => (
      <div className="text-center">
        <div className="size-40 bg-accent/20 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Unplug className="size-24 text-red-500" />
        </div>
        <h2 className="text-xl font-semibold text-foreground mb-2">
          Authentication Required
        </h2>
        <p className="text-muted-foreground mb-2">
          Please connect your wallet to access this page.
        </p>
        <p className="text-xs text-muted-foreground mb-4 max-w-lg mx-auto">
          If your wallet is connected and you're still seeing this message,
          please check your internet connection and{" "}
          <span
            onClick={() => window.location.reload()}
            className="text-accent cursor-pointer"
          >
            refresh
          </span>{" "}
          the page.
        </p>
        <div className="flex gap-2 justify-center">
          <button
            onClick={openWalletModal}
            className="px-4 py-2 bg-accent text-accent-foreground rounded-lg hover:bg-accent/90 transition-colors"
          >
            Connect Wallet
          </button>
          <button
            onClick={authenticate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Sign In
          </button>
        </div>
      </div>
    );

    if (pageLevel) {
      return (
        <div className="min-h-[calc(100vh-200px)] flex items-center justify-center bg-background">
          <ErrorContent />
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center p-8">
        <ErrorContent />
      </div>
    );
  }

  // Render children with auth context
  return children({ user, isAuthenticated });
};

export default AuthWrapper;
