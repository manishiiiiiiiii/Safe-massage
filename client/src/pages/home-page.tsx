import { useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { useQuery } from "@tanstack/react-query";
import { Message, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { LogOut, Send, Wifi, WifiOff, Smile, Menu } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { format } from "date-fns";
import { ChatSidebar } from "@/components/chat-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import EmojiPicker, { EmojiClickData } from "emoji-picker-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { sendMessage, subscribe, isConnected } = useWebSocket();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const { data: initialMessages } = useQuery<Message[]>({
    queryKey: ["/api/messages"],
  });

  useEffect(() => {
    if (initialMessages) {
      setMessages(initialMessages.filter(msg => 
        !selectedUser || 
        msg.senderId === selectedUser.id || 
        msg.receiverId === selectedUser.id
      ));
    }
  }, [initialMessages, selectedUser]);

  useEffect(() => {
    subscribe((message: Message) => {
      setMessages(prev => {
        if (!selectedUser || 
            message.senderId === selectedUser.id || 
            message.receiverId === selectedUser.id) {
          return [...prev, message];
        }
        return prev;
      });
    });
  }, [subscribe, selectedUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !user) return;

    sendMessage({
      content: newMessage,
      senderId: user.id,
      receiverId: selectedUser?.id,
    });

    setNewMessage("");
  };

  const onEmojiClick = (emojiData: EmojiClickData) => {
    const cursor = inputRef.current?.selectionStart || newMessage.length;
    const newValue = 
      newMessage.slice(0, cursor) + 
      emojiData.emoji + 
      newMessage.slice(cursor);
    setNewMessage(newValue);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.setSelectionRange(cursor + 2, cursor + 2);
    }, 0);
  };

  return (
    <div className="h-screen flex">
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <div className={`
        fixed lg:relative
        inset-y-0 left-0
        w-80 z-50
        transform transition-transform duration-200 ease-in-out
        lg:transform-none
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <ChatSidebar 
          onSelectUser={(user) => {
            setSelectedUser(user);
            setIsSidebarOpen(false);
          }}
          selectedUserId={selectedUser?.id}
        />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="border-b p-4 flex justify-between items-center bg-card">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <Avatar>
              <AvatarImage src={user?.avatarUrl || ""} />
            </Avatar>
            <span className="font-medium truncate">
              {selectedUser ? `Chat with ${selectedUser.username}` : "Group Chat"}
            </span>
            {isConnected ? (
              <Wifi className="h-4 w-4 text-green-500 hidden sm:block" />
            ) : (
              <WifiOff className="h-4 w-4 text-destructive animate-pulse hidden sm:block" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <ScrollArea ref={scrollRef} className="flex-1 p-2 sm:p-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className={`flex gap-2 mb-4 ${
                  message.senderId === user?.id ? "justify-end" : "justify-start"
                }`}
              >
                {message.senderId !== user?.id && message.senderId && (
                  <Avatar className="h-8 w-8 hidden sm:block">
                    <AvatarImage src={`https://images.unsplash.com/photo-${1708860028064 + message.senderId}-3303a016e88f`} />
                  </Avatar>
                )}
                <div
                  className={`max-w-[85%] sm:max-w-[70%] ${
                    message.senderId === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  } rounded-lg p-3`}
                >
                  <p className="break-words">{message.content}</p>
                  <span className="text-xs opacity-70">
                    {format(new Date(message.createdAt!), "HH:mm")}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </ScrollArea>

        <Card className="m-2 sm:m-4">
          <form onSubmit={handleSend} className="flex gap-2 p-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message ${selectedUser ? selectedUser.username : 'everyone'}...`}
              className="flex-1"
              disabled={!isConnected}
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button 
                  type="button" 
                  variant="ghost" 
                  size="icon"
                  className="hover:bg-muted hidden sm:flex"
                >
                  <Smile className="h-5 w-5" />
                </Button>
              </PopoverTrigger>
              <PopoverContent 
                className="w-full p-0" 
                side="top" 
                align="end"
              >
                <EmojiPicker
                  onEmojiClick={onEmojiClick}
                  width="100%"
                  height="350px"
                />
              </PopoverContent>
            </Popover>
            <Button type="submit" size="icon" disabled={!isConnected}>
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}