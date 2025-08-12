import { useIsMobile } from "@/hooks/use-mobile";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarHeader,
  SidebarSeparator,
} from "../ui/sidebar";
import { cn } from "@/lib/utils";
import { Input } from "../ui/input";
import { MessageSquare, MessageSquarePlus, Search, Trash2 } from "lucide-react";

const ChatSidebar = ({ prevChats, className }) => {
  const isMobile = useIsMobile();

  return (
    <Sidebar
      variant={isMobile ? "sidebar" : "inset"}
      className={cn(`${isMobile ? "" : "h-auto w-3xs"}`, className)}
    >
      <SidebarHeader>
        <div className="relative">
          <Input placeholder="Search Chats" />
          <Search className="absolute top-[50%] right-2 size-5 translate-y-[-50%]" />
        </div>
      </SidebarHeader>
      <SidebarContent className="">
        <SidebarGroup className="">
          <button className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-2 py-2 hover:bg-neutral-800">
            <MessageSquarePlus className="size-5" />
            <span>New Chat</span>
          </button>
        </SidebarGroup>
        <SidebarSeparator className="mx-0" />
        <SidebarGroup className="">
          <div className="flex flex-col gap-1">
            {prevChats.map((chat, idx) => (
              <div
                key={idx}
                className="flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg px-2 py-2 hover:bg-neutral-800"
              >
                <MessageSquare className="size-5 shrink-0" />
                <span className="flex-grow overflow-hidden text-left text-ellipsis whitespace-nowrap">
                  {chat.title}
                </span>
                <Trash2 className="size-4 shrink-0" />
              </div>
            ))}
          </div>
          <p className="mt-4 w-full text-center text-xs font-light">
            {prevChats.length} chats loaded
          </p>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default ChatSidebar;
