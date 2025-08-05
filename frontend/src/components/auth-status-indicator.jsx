import { Check } from "lucide-react";
import { useAuth } from "../shared/hooks/useAuth";

const AuthStatusIndicator = ({ size = "sm", className = "" }) => {
  const { isAuthenticated, isLoading: isAuthLoading } = useAuth();

  if (!isAuthenticated && !isAuthLoading) {
    return null;
  }

  const sizeClasses = {
    sm: "size-3",
    md: "size-4",
    lg: "size-5",
  };

  const iconSizeClasses = {
    sm: "size-2",
    md: "size-3",
    lg: "size-4",
  };

  const paddingClasses = {
    sm: "p-0.5",
    md: "p-1",
    lg: "p-1.5",
  };

  return (
    <>
      {isAuthenticated && (
        <div
          className={`absolute -top-1 -right-1 bg-green-500 rounded-full ${paddingClasses[size]} border-2 border-background ${className}`}
        >
          <Check className={`${iconSizeClasses[size]} text-white`} />
        </div>
      )}
      {isAuthLoading && !isAuthenticated && (
        <div
          className={`absolute -top-1 -right-1 bg-yellow-500 rounded-full ${paddingClasses[size]} border-2 border-background ${className}`}
        >
          <div
            className={`${sizeClasses[size]} bg-white rounded-full animate-pulse`}
          />
        </div>
      )}
    </>
  );
};

export default AuthStatusIndicator;
