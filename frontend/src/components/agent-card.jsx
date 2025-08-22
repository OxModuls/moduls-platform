import { ArrowUpRight } from "lucide-react";
import { Link } from "react-router";

function AgentCard({ agent, onLinkClick }) {
  const isPending = agent.status === "PENDING";
  const isInactive = agent.status === "INACTIVE";
  const isActive = agent.status === "ACTIVE";

  return (
    <div
      className={`flex items-center gap-3 rounded-lg border bg-primary-foreground px-4 py-3 ${
        isPending ? "opacity-60" : isInactive ? "bg-muted/20 opacity-40" : ""
      }`}
    >
      <div className="flex size-10 items-center justify-center rounded-lg bg-accent">
        {agent.logoUrl ? (
          <img
            src={agent.logoUrl}
            alt={agent.name}
            className="h-10 w-10 rounded-lg"
          />
        ) : (
          <span className="h-7 text-center text-xl font-extrabold">
            {agent.name?.[0] || "A"}
          </span>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="truncate font-bold text-accent">{agent.name}</p>
          {!isActive && (
            <div
              className={`rounded-full px-1.5 py-0.5 text-xs font-medium ${
                isPending
                  ? "bg-yellow-500/20 text-yellow-600 dark:text-yellow-400"
                  : "bg-red-500/20 text-red-600 dark:text-red-400"
              }`}
            >
              {isPending ? "Pending" : "Inactive"}
            </div>
          )}
        </div>
        <div className="mt-1 flex w-[80%] items-center gap-2">
          <span className="w-full truncate text-xs overflow-ellipsis whitespace-nowrap text-muted-foreground">
            {agent.description}
          </span>
        </div>
      </div>
      <div className="flex items-center">
        <Link
          to={`/agents/${agent.uniqueId}`}
          className="flex items-center gap-0.5 text-xs transition-colors duration-500 hover:text-accent"
          onClick={onLinkClick}
        >
          View
          <ArrowUpRight className="size-3" />
        </Link>
      </div>
    </div>
  );
}

export default AgentCard;
