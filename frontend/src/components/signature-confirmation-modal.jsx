import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogPortal,
} from "./ui/dialog";
import { Button } from "./ui/button";
import { useSignatureModalStore } from "../shared/store";
import { Shield, AlertCircle, CheckCircle } from "lucide-react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useAuth } from "../shared/hooks/useAuth";
import { useDisconnect } from "wagmi";

const SignatureConfirmationModal = () => {
  const { isOpen, message, onProceed, onCancel, closeSignatureModal } =
    useSignatureModalStore();
  const { isAuthenticated } = useAuth();
  const { disconnect } = useDisconnect();

  const handleProceed = () => {
    if (onProceed) {
      onProceed();
    }
    closeSignatureModal();
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    }
    // Only disconnect wallet if not authenticated
    if (!isAuthenticated) {
      disconnect();
    }
    closeSignatureModal();
  };

  const handleClose = () => {
    // Only disconnect wallet if not authenticated
    if (!isAuthenticated) {
      disconnect();
    }
    closeSignatureModal();
  };

  if (!message) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogPortal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/20 backdrop-blur-md data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogContent className="border-border/50 bg-background/95 shadow-2xl sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-semibold">
              <Shield className="h-5 w-5 text-accent" />
              Signature Required
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="text-sm">
              <span className="font-medium text-muted-foreground">Domain:</span>
              <span className="ml-2 rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
                {message.domain}
              </span>
            </div>

            <div className="text-sm">
              <span className="font-medium text-muted-foreground">
                Chain ID:
              </span>
              <span className="ml-2 rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
                {message.chainId}
              </span>
            </div>

            <div className="text-sm">
              <span className="font-medium text-muted-foreground">
                Timestamp:
              </span>
              <span className="ml-2 rounded bg-muted px-2 py-1 font-mono text-xs text-foreground">
                {new Date(message.issuedAt).toLocaleString()}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-lg border border-border bg-accent/10 p-3">
            <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-accent" />
            <div className="text-sm">
              <p className="mb-1 font-medium text-foreground">
                Authentication Required
              </p>
              <p className="text-muted-foreground">
                Your wallet signature is needed to verify your identity and
                complete the authentication process.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <CheckCircle className="h-4 w-4 text-accent" />
            <span className="text-sm text-muted-foreground">
              This signature request is secure and only for authentication
              purposes.
            </span>
          </div>

          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={handleCancel} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleProceed} className="flex-1">
              Proceed & Sign
            </Button>
          </div>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
};

export default SignatureConfirmationModal;
