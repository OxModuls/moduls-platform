import { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverAnchor,
  PopoverTrigger,
} from "../ui/popover";
import { SidebarInset, SidebarProvider } from "../ui/sidebar";
import { Separator } from "../ui/separator";
import ChatSidebar from "./chat-sidebar";
import AgentChat from "./agent-chat";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MessageCircle } from "lucide-react";

const ChatPopup = ({ open, onOpenChange, agent }) => {
  const [fullScreen, setFullScreen] = useState(false);
  const [selectedThreadId, setSelectedThreadId] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleThreadSelect = (threadId) => {
    setSelectedThreadId(threadId);
  };

  const handleThreadCreated = (threadId) => {
    setSelectedThreadId(threadId);
  };

  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={true}>
      <PopoverTrigger asChild>
        <button
          data-popover-open={open}
          className="group data-[popover-open=false]:animate-float fixed right-4 bottom-8 z-20 cursor-pointer rounded-full bg-gradient-to-br from-accent/20 to-accent/10 p-3 shadow-lg backdrop-blur-sm transition-all duration-300 hover:scale-110 hover:shadow-xl hover:shadow-accent/25 active:scale-95 active:shadow-lg"
        >
          {/* Animated background ring */}
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-accent/30 to-accent/10 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />

          {/* Main icon container */}
          <div className="relative z-10 flex items-center justify-center">
            <MessageCircle className="size-12 fill-accent/40 stroke-accent stroke-1 text-accent transition-all duration-300 group-hover:fill-accent/80 group-hover:stroke-accent/80 group-active:fill-accent/90 group-active:stroke-accent/90 md:size-16" />
          </div>

          {/* Agent avatar overlay */}
          <div className="absolute top-[50%] left-[50%] z-20 translate-[-50%]">
            <Avatar className="size-8 ring-2 ring-background transition-transform duration-300 group-active:scale-95 md:size-10">
              <AvatarImage src={agent.logoUrl} />
              <AvatarFallback className="text-xs font-semibold">
                {agent.name?.charAt(0)?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
          </div>

          {/* Pulse animation when closed */}
          <div
            hidden={open}
            className="absolute inset-0 animate-ping rounded-full bg-accent/20 opacity-20"
          />
        </button>
      </PopoverTrigger>
      <div hidden={!open} className={`fixed inset-0 z-10 bg-black/50`} />

      {fullScreen && <PopoverAnchor className="fixed top-0 left-0" />}

      <PopoverContent
        className="flex w-screen p-0 transition-all duration-200 data-[fullscreen=true]:h-screen md:w-[calc(var(--sidebar-width)+28rem)] data-[fullscreen=true]:md:w-screen"
        data-fullscreen={fullScreen}
      >
        <SidebarProvider
          defaultOpen={false}
          style={{
            "--sidebar-width": "16rem",
            "--sidebar-width-mobile": "16rem",
          }}
          className="min-h-none"
        >
          <ChatSidebar
            className={`${fullScreen || "sgroup-data-[collapsible=offcanvas]:-z-10 group-data-[collapsible=offcanvas]:left-[calc(var(--sidebar-width)*1)]"}`}
            agent={agent}
            selectedThreadId={selectedThreadId}
            onThreadSelect={handleThreadSelect}
          />
          <Separator orientation="vertical" />
          <SidebarInset className="z-10 bg-inherit md:peer-data-[variant=inset]:m-0">
            <AgentChat
              agent={agent}
              selectedThreadId={selectedThreadId}
              fullScreen={fullScreen}
              onFullScreenChange={setFullScreen}
              onOpenChange={onOpenChange}
              onThreadCreated={handleThreadCreated}
            />
          </SidebarInset>
        </SidebarProvider>
      </PopoverContent>
    </Popover>
  );
};

export default ChatPopup;
