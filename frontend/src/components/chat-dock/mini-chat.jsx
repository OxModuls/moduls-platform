import { X, Maximize2, ChevronDown } from "lucide-react";
import { useChatSession } from "@/shared/hooks/useChatSession";
import { useEffect, useRef, useState } from "react";
import { useBalance } from "wagmi";
import { getPromptSuggestions } from "./suggestions";
import { ellipsizeAddress, cn } from "@/lib/utils";
import { useEnterToSend } from "@/shared/hooks/useEnterToSend";
import { useAuth } from "@/shared/hooks/useAuth";
import { useThreadStore } from "@/shared/store";
import jazzicon from "@metamask/jazzicon";

function formatModulType(type) {
  if (!type) return "";
  return String(type)
    .toLowerCase()
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function generateJazzicon(address, size = 32) {
  if (!address) return null;
  try {
    const seed = parseInt(address.slice(2, 10), 16);
    return jazzicon(size, seed);
  } catch (error) {
    console.error("Error generating jazzicon:", error);
    return null;
  }
}

function Header({ agent, balance, onMaximize, onClose }) {
  return (
    <div className="flex items-center justify-between border-b px-3 py-2">
      <div className="flex min-w-0 items-center gap-2">
        <img
          src={agent?.logoUrl}
          alt={agent?.name}
          className="h-8 w-8 rounded-lg"
        />
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="truncate text-sm font-semibold">{agent?.name}</div>
            {agent?.modulType && (
              <span className="shrink-0 rounded-md bg-accent/15 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                {formatModulType(agent.modulType)}
              </span>
            )}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {agent?.walletAddress
              ? ellipsizeAddress(agent.walletAddress, 4, 4)
              : ""}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-xs font-semibold text-accent">
          {balance || "--"}
        </div>
        <button
          className="cursor-pointer rounded-md p-1 transition-colors hover:bg-accent/10"
          onClick={onMaximize}
          title="Maximize"
        >
          <Maximize2 className="size-4" />
        </button>
        <button
          className="cursor-pointer rounded-md p-1 transition-colors hover:bg-accent/10"
          onClick={onClose}
          title="Close"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

function MessageList({
  messages,
  isSending,
  suggestions = [],
  onSuggestionClick,
  onControls,
  agent,
  currentUser,
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
  return (
    <div
      ref={scrollRef}
      className="custom-scrollbar relative flex-1 space-y-4 overflow-y-auto p-3"
    >
      {messages?.length === 0 ? (
        <div className="flex h-full items-center justify-center py-6">
          <div className="mx-auto max-w-sm text-center">
            <h2 className="text-2xl font-extrabold text-red-600 dark:text-red-500">
              Start a Conversation
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask about this agent and token, or use a quick suggestion below.
            </p>
            {suggestions.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {suggestions.map((s, i) => (
                  <button
                    key={i}
                    className="cursor-pointer rounded-lg border bg-input/30 px-2 py-1 text-xs hover:bg-input/50"
                    onClick={() => onSuggestionClick?.(s)}
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
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
                "w-max max-w-[85%] rounded-2xl px-3 py-2 text-sm break-words whitespace-pre-wrap",
                m.role === "user" ? "bg-accent/15" : "bg-muted/40",
              )}
            >
              {m.content}
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
          <div className="w-max max-w-[60%] rounded-2xl bg-muted/40 px-3 py-2 text-sm">
            <span className="inline-flex items-center gap-1">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]"></span>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground"></span>
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:0.2s]"></span>
            </span>
          </div>
        </div>
      )}
      <div ref={listRef} />
      {/* Scroll button moved to parent container to avoid scrolling with messages */}
    </div>
  );
}

function InputBar({ value, onChange, onSend, disabled }) {
  const { handleKeyDown } = useEnterToSend({
    value,
    setValue: onChange,
    onSend,
    disabled,
  });
  return (
    <div className="border-t p-2">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!value?.trim() || disabled) return;
          onSend(value);
          onChange("");
        }}
        className="flex items-center gap-2"
      >
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a message..."
          rows={1}
          className="no-scrollbar max-h-28 min-h-[38px] flex-1 resize-none rounded-lg border border-white/20 bg-transparent p-2 py-3 text-sm focus:border-white/40 focus:outline-none"
        />
        <button
          disabled={disabled}
          className="bg-button-gradient cursor-pointer rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function MiniChat({ agent, onMaximize, onClose }) {
  const [inputValue, setInputValue] = useState("");
  const [isClosing, setIsClosing] = useState(false);
  const { user: currentUser } = useAuth();
  const { data: agentWalletBalance } = useBalance({
    address: agent?.walletAddress,
  });
  const { selectedThreadId } = useThreadStore();
  const { messages, isSending, sendMessage } = useChatSession(agent?.uniqueId);

  const [showScrollBtn, setShowScrollBtn] = useState(false);
  const scrollToBottomRef = useRef(() => {});

  const handleSend = (text) => {
    if (!text?.trim()) return;
    sendMessage(text);
  };

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200); // Match the animation duration
  };

  return (
    <>
      <div
        className="fixed inset-0 z-30 animate-in bg-black/50 backdrop-blur-sm duration-200 fade-in sm:hidden"
        onClick={handleClose}
      />
      <div
        className={`fixed right-2 bottom-4 z-40 flex h-[70svh] max-h-[calc(100svh-2rem)] w-[calc(100vw-1rem)] max-w-[420px] flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:right-4 sm:bottom-6 sm:h-[420px] sm:max-h-[420px] sm:w-[400px] ${
          isClosing
            ? "animate-out duration-500 ease-in slide-out-to-bottom-4"
            : "animate-in duration-500 ease-out slide-in-from-bottom-4"
        }`}
      >
        <Header
          agent={agent}
          balance={
            agentWalletBalance?.formatted
              ? `${Number(agentWalletBalance.formatted).toPrecision(8)} SEI`
              : "--"
          }
          onMaximize={onMaximize}
          onClose={handleClose}
        />
        <MessageList
          messages={messages}
          isSending={isSending}
          suggestions={getPromptSuggestions(agent?.modulType)}
          onSuggestionClick={handleSend}
          agent={agent}
          currentUser={currentUser}
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
            className="absolute right-4 bottom-20 z-50 cursor-pointer rounded-full border bg-background/90 p-2 shadow-md transition hover:bg-background"
          >
            <ChevronDown className="size-4" />
          </button>
        )}
        <InputBar
          value={inputValue}
          onChange={setInputValue}
          onSend={handleSend}
          disabled={isSending || !inputValue.trim()}
        />
      </div>
    </>
  );
}

export default MiniChat;
