import {
  X,
  Minimize2,
  PanelLeft,
  PanelLeftClose,
  ChevronDown,
  Send,
  Trash2,
  Plus,
} from "lucide-react";

import { useEffect, useRef, useState } from "react";
import { useEnterToSend } from "@/shared/hooks/useEnterToSend";
import { useBalance } from "wagmi";
import { getPromptSuggestions } from "./suggestions";
import { ellipsizeAddress, cn, generateJazzicon } from "@/lib/utils";
import { useChatSession } from "@/shared/hooks/useChatSession";
import { useDeleteThread, useCreateThread } from "@/shared/hooks/useChat";
import { useAuth } from "@/shared/hooks/useAuth";
import { useWalletModalStore, useThreadStore } from "@/shared/store";
import MarkdownRenderer from "@/components/ui/md";

function formatModulType(type) {
  if (!type) return "";
  return String(type)
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

// Relative time helper for thread timestamps
function formatRelativeTime(value) {
  try {
    const d = new Date(value);
    const diffMs = Date.now() - d.getTime();
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
    const minutes = Math.round(diffMs / 60000);
    if (Math.abs(minutes) < 60) return rtf.format(-minutes, "minute");
    const hours = Math.round(minutes / 60);
    if (Math.abs(hours) < 24) return rtf.format(-hours, "hour");
    const days = Math.round(hours / 24);
    if (Math.abs(days) < 30) return rtf.format(-days, "day");
    const months = Math.round(days / 30);
    if (Math.abs(months) < 12) return rtf.format(-months, "month");
    const years = Math.round(months / 12);
    return rtf.format(-years, "year");
  } catch {
    return "";
  }
}

function ThreadsPanel({
  threads,
  loading,
  selectedThreadId,
  onSelectThread,
  isAuthenticated,
  onConnectWallet,
  onDeleteThread,
  onCreateThread,
}) {
  const isPending = loading;

  return (
    <div className="flex h-full w-64 flex-col border-r">
      <div className="flex-shrink-0 p-3">
        <div className="mb-2 text-sm font-semibold text-muted-foreground">
          Chats
        </div>
        <div className="mb-2">
          <button
            className="w-full cursor-pointer rounded-md border px-4 py-2.5 text-left text-base transition-colors hover:bg-muted/40"
            onClick={onCreateThread}
          >
            <span className="inline-flex items-center gap-2">
              <Plus className="size-4" />
              <span>New chat</span>
            </span>
          </button>
        </div>
      </div>
      <div className="custom-scrollbar flex-1 overflow-x-hidden overflow-y-auto p-3 pt-0">
        <div className="flex flex-col gap-2">
          {isPending &&
            Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="h-10 animate-pulse rounded-lg bg-accent/10"
              />
            ))}
          {!isPending && !isAuthenticated && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 rounded-full bg-muted/20 p-3">
                <svg
                  className="h-8 w-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">
                Connect Wallet to View Conversations
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Please connect your wallet to see your conversation history with
                this agent
              </p>
              <button
                onClick={onConnectWallet}
                className="mt-4 rounded-lg bg-accent px-5 py-2.5 text-sm font-semibold text-accent-foreground transition-colors hover:bg-accent/90 active:scale-95"
              >
                Connect Wallet
              </button>
              <div className="mt-4 w-full">
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
              </div>
            </div>
          )}
          {!isPending && isAuthenticated && (threads?.length || 0) === 0 && (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <div className="mb-4 rounded-full bg-muted/20 p-3">
                <svg
                  className="h-8 w-8 text-muted-foreground"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                  />
                </svg>
              </div>
              <h3 className="mb-2 text-base font-semibold text-foreground">
                No Conversations Yet
              </h3>
              <p className="text-sm leading-relaxed text-muted-foreground">
                Start chatting with this agent to create your first conversation
                thread
              </p>
              <div className="mt-4 w-full">
                <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent"></div>
              </div>
            </div>
          )}
          {(threads || []).map((t) => (
            <div
              key={t.uniqueId}
              className="group flex w-full items-center gap-2 pt-2"
            >
              <button
                className={`flex-1 truncate rounded-md px-4 py-2.5 text-left text-base transition-colors ${
                  selectedThreadId === t.uniqueId
                    ? "bg-accent/15"
                    : "hover:bg-muted/40"
                }`}
                onClick={() => onSelectThread(t.uniqueId)}
                title={t.title || "New conversation"}
              >
                <span
                  className={`block truncate font-semibold ${
                    selectedThreadId === t.uniqueId ? "text-foreground" : ""
                  }`}
                >
                  {t.title || "New conversation"}
                </span>
                <span className="block truncate text-sm text-muted-foreground">
                  {formatRelativeTime(t.createdAt || t.updatedAt)}
                </span>
              </button>
              <button
                title="Delete conversation"
                aria-label="Delete conversation"
                className="invisible shrink-0 cursor-pointer rounded-md p-1 text-muted-foreground transition-colors group-hover:visible hover:bg-red-500/10 hover:text-red-500"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteThread?.(t.uniqueId);
                }}
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ChatHeader({ agent, onRestore, onClose }) {
  const { data: agentWalletBalance } = useBalance({
    address: agent?.walletAddress,
  });
  const balanceText = agentWalletBalance?.formatted
    ? `${Number(agentWalletBalance.formatted).toPrecision(8)} SEI`
    : "--";
  return (
    <div className="flex items-center justify-between px-3 py-3 sm:px-6">
      {/* Left side - Agent details */}
      <div className="flex min-w-0 items-center gap-2 sm:gap-4">
        {/* Agent avatar with subtle shadow */}
        <div className="relative">
          <img
            src={agent?.logoUrl}
            alt={agent?.name}
            className="h-8 w-8 rounded-xl shadow-lg ring-2 ring-accent/10 sm:h-12 sm:w-12"
          />
          <div className="absolute -right-1 -bottom-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background sm:h-4 sm:w-4"></div>
        </div>

        {/* Agent info with better spacing */}
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <h1 className="truncate text-base font-bold text-foreground sm:text-xl">
              {agent?.name}
            </h1>
            {agent?.modulType && (
              <span className="shrink-0 rounded-full bg-gradient-to-r from-accent/20 to-accent/10 px-3 py-1 text-sm font-semibold text-accent ring-1 ring-accent/20 sm:px-4 sm:py-1.5 sm:text-base">
                {formatModulType(agent.modulType)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 text-sm text-muted-foreground sm:gap-4 sm:text-base">
            {agent?.walletAddress && (
              <div className="flex items-center gap-1.5">
                <span className="text-sm">📍</span>
                <span className="font-mono text-sm">
                  {ellipsizeAddress(agent.walletAddress, 4, 4)}
                </span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="text-sm">💰</span>
              <span className="font-mono font-semibold text-accent">
                {balanceText}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Action buttons */}
      <div className="flex items-center gap-1 sm:gap-2">
        <button
          className="group relative cursor-pointer rounded-lg p-1.5 transition-all duration-200 hover:bg-accent/10 hover:shadow-md active:scale-95 sm:p-2"
          onClick={onRestore}
          title="Restore to mini chat"
        >
          <Minimize2 className="size-4 text-muted-foreground transition-colors group-hover:text-accent sm:size-5" />
          <div className="absolute inset-0 rounded-lg bg-accent/5 opacity-0 transition-opacity group-hover:opacity-100"></div>
        </button>

        <div className="h-4 w-px bg-border sm:h-6"></div>

        <button
          className="group relative cursor-pointer rounded-lg p-1.5 transition-all duration-200 hover:bg-red-500/10 hover:shadow-md active:scale-95 sm:p-2"
          onClick={onClose}
          title="Close chat"
        >
          <X className="size-4 text-muted-foreground transition-colors group-hover:text-red-500 sm:size-5" />
          <div className="absolute inset-0 rounded-lg bg-red-500/5 opacity-0 transition-opacity group-hover:opacity-100"></div>
        </button>
      </div>
    </div>
  );
}

function MessagesView({
  messages,
  modulType,
  isSending,
  isPending: isLoading,
  agent,
  currentUser,
  onControls,
  selectedThreadId,
  sendMessage,
}) {
  const listRef = useRef(null);
  const scrollRef = useRef(null);
  const [isAtBottom, setIsAtBottom] = useState(true);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  };

  // Track scroll position to decide when to show the button and when to auto-scroll
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const threshold = 200; // px tolerance
      const atBottom =
        el.scrollTop + el.clientHeight >= el.scrollHeight - threshold;
      setIsAtBottom(atBottom);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    // Initialize state
    onScroll();
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  // Auto scroll when new messages arrive only if already at bottom (or on first load)
  useEffect(() => {
    if (isAtBottom) {
      scrollToBottom();
    }
  }, [messages?.length]);

  // Keep typing indicator in view when sending if user is already near bottom
  useEffect(() => {
    if (isSending) {
      scrollToBottom();
    }
  }, [isSending]);

  // Expose controls to parent so the scroll button can be anchored outside
  useEffect(() => {
    onControls?.({
      isAtBottom,
      scrollToBottom,
      hasMessages: (messages?.length || 0) > 0,
    });
  }, [isAtBottom, messages?.length]);

  if (isLoading && selectedThreadId) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-6 text-center text-sm text-muted-foreground">
        Loading messages...
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      className="custom-scrollbar relative min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto p-4"
    >
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center py-6">
          <div className="mx-auto max-w-sm text-center">
            <h2 className="text-3xl font-extrabold text-red-600 dark:text-red-500">
              Start a Conversation
            </h2>
            <p className="mt-2 text-base text-muted-foreground">
              Ask about this agent and token, or use a quick suggestion below.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {getPromptSuggestions(modulType).map((s, i) => (
                <span
                  key={i}
                  className="cursor-pointer rounded-lg border bg-input/30 px-3 py-1.5 text-sm hover:bg-input/50"
                  onClick={() => sendMessage(s)}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>
      ) : (
        messages.map((m) => (
          <div
            key={m._id}
            className={cn(
              "flex items-start gap-2",
              m.role === "user" ? "flex-row-reverse" : "flex-row",
            )}
          >
            {m.role === "user" ? (
              // User avatar
              <div className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full">
                {currentUser?.walletAddress ? (
                  <div
                    ref={(el) => {
                      if (el) {
                        const icon = generateJazzicon(
                          currentUser.walletAddress,
                          32,
                        );
                        if (icon) {
                          el.innerHTML = "";
                          el.appendChild(icon);
                        }
                      }
                    }}
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center bg-muted/40 text-xs font-semibold text-muted-foreground">
                    U
                  </div>
                )}
              </div>
            ) : (
              // Agent avatar
              <img
                src={agent?.logoUrl}
                alt={agent?.name}
                className="h-8 w-8 shrink-0 rounded-full"
              />
            )}
            <div
              className={cn(
                "max-w-[75%] overflow-hidden rounded-2xl px-4 py-3.5 text-base break-words whitespace-pre-wrap",
                m.role === "user" ? "bg-accent/15" : "bg-muted/40",
              )}
            >
              <MarkdownRenderer content={m.content} />
            </div>
          </div>
        ))
      )}
      {isSending && (
        <div className="flex items-start gap-2">
          <img
            src={agent?.logoUrl}
            alt={agent?.name}
            className="h-8 w-8 shrink-0 rounded-full"
          />
          <div className="max-w-[50%] overflow-hidden rounded-2xl bg-muted/40 px-4 py-3.5 text-base">
            <span className="inline-flex items-center gap-1.5">
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]"></span>
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground"></span>
              <span className="h-2 w-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.2s]"></span>
            </span>
          </div>
        </div>
      )}
      <div ref={listRef} className="h-10" />
      {/* Scroll button moved to parent container to avoid scrolling with messages */}
    </div>
  );
}

function InputBox({ onSend, disabled }) {
  const [value, setValue] = useState("");
  const textareaRef = useRef(null);
  const MAX_TEXTAREA_HEIGHT = 100; // px cap

  const { handleKeyDown } = useEnterToSend({
    value,
    setValue,
    onSend,
    disabled,
  });

  // Auto-grow textarea height up to a cap
  const adjustHeight = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_TEXTAREA_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY =
      el.scrollHeight > MAX_TEXTAREA_HEIGHT ? "auto" : "hidden";
  };

  useEffect(() => {
    adjustHeight();
  }, [value]);

  return (
    <div className="border-t p-2 sm:p-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!value.trim() || disabled) return;
          onSend(value);
          setValue("");
          // reset height after send
          requestAnimationFrame(() => adjustHeight());
        }}
        className="flex items-center gap-2"
      >
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onInput={adjustHeight}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="no-scrollbar min-h-[48px] flex-1 resize-none self-stretch rounded-xl border border-white/20 bg-transparent px-4 py-3 text-base leading-6 focus:border-white/40 focus:outline-none sm:min-h-[48px]"
          style={{ maxHeight: MAX_TEXTAREA_HEIGHT }}
        />
        <button
          disabled={disabled || !value.trim()}
          className="bg-button-gradient flex h-[48px] items-center justify-center rounded-lg px-5 text-base font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
        >
          <Send className="size-4 sm:hidden" />
          <span className="hidden sm:inline">Send</span>
        </button>
      </form>
    </div>
  );
}

function FullscreenChat({ agent, onRestore, onClose }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const scrollToBottomRef = useRef(() => {});
  const { isAuthenticated, user: currentUser } = useAuth();
  const { openWalletModal } = useWalletModalStore();
  const { selectedThreadId, setSelectedThreadId } = useThreadStore();
  const deleteThreadMutation = useDeleteThread();
  const createThreadMutation = useCreateThread();

  const {
    threads,
    threadsLoading,
    messages,
    messagesLoading,
    isSending,
    sendMessage,
  } = useChatSession(agent?.uniqueId);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200); // Match the animation duration
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col overflow-hidden bg-background ${
        isClosing
          ? "animate-out duration-500 ease-in fade-out"
          : "animate-in duration-500 ease-out fade-in"
      }`}
    >
      <div className="flex items-center justify-between border-b bg-gradient-to-r from-background to-muted/20 px-3 py-2 sm:px-6">
        {/* Left side - Sidebar toggle */}
        <div className="flex items-center gap-2">
          <button
            className="group relative cursor-pointer rounded-lg p-2 transition-all duration-200 hover:bg-accent/10 hover:shadow-md active:scale-95"
            title={sidebarOpen ? "Hide conversations" : "Show conversations"}
            onClick={() => setSidebarOpen((v) => !v)}
          >
            {sidebarOpen ? (
              <PanelLeftClose className="size-5 text-muted-foreground transition-colors group-hover:text-accent" />
            ) : (
              <PanelLeft className="size-5 text-muted-foreground transition-colors group-hover:text-accent" />
            )}
            <div className="absolute inset-0 rounded-lg bg-accent/5 opacity-0 transition-opacity group-hover:opacity-100"></div>
          </button>
        </div>

        {/* Center - Chat header */}
        <div className="min-w-0 flex-1">
          <ChatHeader
            agent={agent}
            onRestore={onRestore}
            onClose={handleClose}
          />
        </div>
      </div>
      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <div
          className={`${sidebarOpen ? "w-64" : "w-0"} hidden shrink-0 overflow-hidden border-r transition-[width] duration-200 ease-in-out sm:block`}
        >
          <ThreadsPanel
            threads={threads}
            loading={threadsLoading}
            selectedThreadId={selectedThreadId}
            onSelectThread={setSelectedThreadId}
            isAuthenticated={isAuthenticated}
            onConnectWallet={openWalletModal}
            onDeleteThread={(id) => deleteThreadMutation.mutate(id)}
            onCreateThread={async () => {
              try {
                const res = await createThreadMutation.mutateAsync({
                  agentId: agent?.uniqueId,
                  title: "New conversation",
                });
                const newId =
                  res?.data?.uniqueId || res?.data?.thread?.uniqueId;
                if (newId) setSelectedThreadId(newId);
              } catch {
                // noop, toast handled in hook
              }
            }}
          />
        </div>
        {/* Mobile overlay and drawer */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm sm:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}
        <div
          className={`${sidebarOpen ? "translate-x-0" : "-translate-x-full"} fixed top-0 left-0 z-50 h-screen w-64 overflow-hidden border-r bg-background transition-transform duration-200 ease-in-out sm:hidden`}
        >
          <ThreadsPanel
            threads={threads}
            loading={threadsLoading}
            selectedThreadId={selectedThreadId}
            onSelectThread={(id) => {
              setSelectedThreadId(id);
              setSidebarOpen(false);
            }}
            isAuthenticated={isAuthenticated}
            onConnectWallet={openWalletModal}
            onDeleteThread={(id) => deleteThreadMutation.mutate(id)}
            onCreateThread={async () => {
              try {
                const res = await createThreadMutation.mutateAsync({
                  agentId: agent?.uniqueId,
                  title: "New conversation",
                });
                const newId =
                  res?.data?.uniqueId || res?.data?.thread?.uniqueId;
                if (newId) {
                  setSelectedThreadId(newId);
                  setSidebarOpen(false);
                }
              } catch {
                // noop
              }
            }}
          />
        </div>

        <div className="custom-scrollbar relative flex min-h-0 max-w-[100%] flex-1 flex-col overflow-x-hidden">
          <MessagesView
            messages={messages}
            modulType={agent?.modulType}
            isSending={isSending}
            isPending={messagesLoading}
            agent={agent}
            currentUser={currentUser}
            selectedThreadId={selectedThreadId}
            sendMessage={sendMessage}
            onControls={({ isAtBottom, scrollToBottom, hasMessages }) => {
              scrollToBottomRef.current = scrollToBottom;
              setShowScrollBtn(!isAtBottom && !!hasMessages);
            }}
          />
          {showScrollBtn && (
            <button
              type="button"
              aria-label="Scroll to bottom"
              onClick={() => scrollToBottomRef.current?.()}
              className="absolute right-6 bottom-24 z-50 cursor-pointer rounded-full border bg-background/90 p-2 shadow-md transition hover:bg-background"
            >
              <ChevronDown className="size-4" />
            </button>
          )}
          <InputBox onSend={sendMessage} disabled={isSending} />
        </div>
      </div>
    </div>
  );
}

export default FullscreenChat;
