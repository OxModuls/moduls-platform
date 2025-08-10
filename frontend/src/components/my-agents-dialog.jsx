import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "./ui/dialog";
import { Separator } from "./ui/separator";
import { keepPreviousData, useQueries } from "@tanstack/react-query";
import AgentCard from "./agent-card";
import config from "../shared/config";
import { useAccount } from "wagmi";
import { createFetcher } from "../lib/fetcher";
import { useAuth } from "../shared/hooks/useAuth";
import { Link } from "react-router";
import { useWalletModalStore } from "../shared/store";

const MyAgentsDialog = ({ open, onOpenChange }) => {
  const { isAuthenticated } = useAuth();
  const { address } = useAccount();
  const { closeWalletModal } = useWalletModalStore();

  const [myAgentsResult] = useQueries({
    queries: [
      {
        queryKey: [config.endpoints.getMyAgents, address],
        queryFn: createFetcher({
          url: config.endpoints.getMyAgents,
          method: "GET",
          credentials: "include",
        }),
        placeholderData: keepPreviousData,
        enabled: isAuthenticated,
        refetchInterval: 1000 * 60,
      },
    ],
  });
  const { data: agentsData, isLoading: isMyAgentsLoading } = myAgentsResult;
  const myAgents = agentsData?.agents || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent showCloseButton={true} className="md:w-sm">
        <DialogHeader>
          <DialogTitle>My Agents</DialogTitle>
          <DialogDescription className="sr-only">
            View your agents
          </DialogDescription>
          <Separator className="my-2" />
          <div className="h-96 overflow-y-auto">
            <div className="mt-4 w-full">
              {isMyAgentsLoading && !myAgents ? (
                <div className="h-16 w-full animate-pulse rounded-lg bg-accent/20 transition-opacity duration-500" />
              ) : myAgents && myAgents.length > 0 ? (
                <div className="flex flex-col gap-3">
                  {myAgents.map((agent) => (
                    <AgentCard
                      key={agent.uniqueId}
                      agent={agent}
                      onLinkClick={() => {
                        onOpenChange(false);
                        closeWalletModal();
                      }}
                    />
                  ))}
                </div>
              ) : (
                <div className="rounded-lg border-2 border-dashed border-accent/20 bg-primary-foreground px-4 py-4 text-center text-muted-foreground">
                  <p className="block font-semibold">No agents yet</p>
                  <span className="mt-1 block text-xs">
                    You haven't launched any agents.
                  </span>
                  <Link
                    to="/create"
                    className="bg-button-gradient mx-auto mt-4 block w-fit rounded-lg px-3 py-2 text-white"
                    onClick={() => {
                      onOpenChange(false);
                      closeWalletModal();
                    }}
                  >
                    Launch an agent
                  </Link>
                </div>
              )}
            </div>
          </div>
        </DialogHeader>
      </DialogContent>
    </Dialog>
  );
};

export default MyAgentsDialog;
