import { useAuth } from "../shared/hooks/useAuth";
import { Unplug } from "lucide-react";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import { useWalletModalStore } from "../shared/store";
import { useAccount } from "wagmi";

const AuthWrapper = ({
  children,
  fallback = null,
  pageLevel = true,
  redirectUrl = null,
}) => {
  const { user, isAuthenticated, isLoading, error, authenticate } = useAuth();
  const { isConnected } = useAccount();

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
          <div className="flex size-40 animate-pulse items-center justify-center rounded-2xl bg-accent/20">
            <Unplug className="size-24 text-accent" />
          </div>
          <div className="absolute inset-0 animate-ping rounded-2xl border-2 border-accent/30"></div>
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
        <div className="flex min-h-[calc(100vh-100px)] items-center justify-center bg-background">
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
        <div className="mx-auto mb-4 flex size-40 items-center justify-center rounded-2xl bg-accent/20">
          <Unplug className="size-24 text-red-500" />
        </div>
        <h2 className="mb-2 text-xl font-semibold text-foreground">
          Authentication Required
        </h2>
        <p className="mb-2 text-muted-foreground">
          {!isConnected
            ? "Please connect your wallet to access this page."
            : "Please sign in with your wallet to access this page."}
        </p>
        <p className="mx-auto mb-4 max-w-lg text-xs text-muted-foreground">
          If your wallet is connected and you're still seeing this message,
          please check your internet connection and{" "}
          <span
            onClick={() => window.location.reload()}
            className="cursor-pointer text-accent"
          >
            refresh
          </span>{" "}
          the page.
        </p>
        <div className="flex justify-center gap-2">
          {!isConnected ? (
            <button
              onClick={openWalletModal}
              className="rounded-lg bg-accent px-4 py-2 text-accent-foreground transition-colors hover:bg-accent/90"
            >
              Connect Wallet
            </button>
          ) : (
            <button
              onClick={authenticate}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700"
            >
              Sign In
            </button>
          )}
        </div>
      </div>
    );

    if (pageLevel) {
      return (
        <div className="flex min-h-[calc(100vh-200px)] items-center justify-center bg-background">
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
