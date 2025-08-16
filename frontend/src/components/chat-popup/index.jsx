import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { SidebarInset, SidebarProvider } from "../ui/sidebar";
import { PopoverAnchor } from "@radix-ui/react-popover";
import { Separator } from "../ui/separator";
import ChatSidebar from "./chat-sidebar";
import AgentChat from "./agent-chat";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { MessageCircle } from "lucide-react";

const ChatPopup = ({ open, onOpenChange, agent }) => {
  const [fullScreen, setFullScreen] = useState(false);
  const prevChats = [
    { title: "What's the most effective way to use you" },
    { title: "Check my SEI balance" },
  ];

  return (
    <Popover open={open} onOpenChange={onOpenChange} modal={true}>
      <PopoverTrigger asChild>
        <button data-popover-open={open} className="cursor-pointe fixed right-4 bottom-16 z-20 data-[popover-open=false]:animate-pulse-bounce">
          <MessageCircle className="size-16 md:size-20 fill-accent/50 stroke-1 text-accent" />
          <Avatar className="absolute top-[50%] left-[50%] z-10 size-11 md:size-14 translate-x-[-50%] translate-y-[-50%]">
            <AvatarImage src={agent.logoUrl} />
            <AvatarFallback>
              {agent.name?.charAt(0)?.toUpperCase()}
            </AvatarFallback>
          </Avatar>
        </button>
      </PopoverTrigger>
      <div hidden={!open} className={`fixed inset-0 z-10 bg-black/50`} />

      {fullScreen && (
        <PopoverAnchor className="fixed top-0 left-0"></PopoverAnchor>
      )}

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
            prevChats={prevChats}
          />
          <Separator orientation="vertical" />
          <SidebarInset className="z-10 bg-inherit md:peer-data-[variant=inset]:m-0">
            <AgentChat
              agent={agent}
              fullScreen={fullScreen}
              onFullScreenChange={setFullScreen}
              onOpenChange={onOpenChange}
            />
          </SidebarInset>
        </SidebarProvider>
      </PopoverContent>
    </Popover>
  );
};

export default ChatPopup;
