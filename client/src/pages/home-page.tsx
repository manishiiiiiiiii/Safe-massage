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
import { Redirect } from "wouter";

// Animation variants for messages
const messageVariants = {
  initial: { 
    opacity: 0, 
    y: 20,
    scale: 0.95
  },
  animate: { 
    opacity: 1, 
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20
    }
  },
  exit: { 
    opacity: 0,
    scale: 0.95,
    transition: { duration: 0.2 }
  }
};

// Typing indicator component
const TypingIndicator = () => (
  <div className="flex gap-1 p-2 rounded-lg bg-muted/50 w-fit">
    <motion.div
      className="w-2 h-2 bg-primary/50 rounded-full"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 0.5, repeat: Infinity, delay: 0 }}
    />
    <motion.div
      className="w-2 h-2 bg-primary/50 rounded-full"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 0.5, repeat: Infinity, delay: 0.15 }}
    />
    <motion.div
      className="w-2 h-2 bg-primary/50 rounded-full"
      animate={{ y: [0, -5, 0] }}
      transition={{ duration: 0.5, repeat: Infinity, delay: 0.3 }}
    />
  </div>
);

export default function HomePage() {
  const { user, logoutMutation } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const { sendMessage, subscribe, isConnected } = useWebSocket();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

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
      setIsTyping(false);
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

  const handleTyping = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    setIsTyping(true);

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false);
    }, 1000);
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

  // If no user, redirect to auth page
  if (!user) {
    return <Redirect to="/auth" />;
  }

  return (
    <div className="h-screen flex bg-gradient-to-br from-background to-muted/20">
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      <motion.div 
        initial={false}
        animate={{ 
          x: isSidebarOpen ? 0 : -320,
          width: isSidebarOpen ? 320 : 0
        }}
        className="fixed lg:relative lg:w-80 inset-y-0 left-0 z-50 lg:transform-none"
      >
        <ChatSidebar 
          onSelectUser={(user) => {
            setSelectedUser(user);
            setIsSidebarOpen(false);
          }}
          selectedUserId={selectedUser?.id}
        />
      </motion.div>

      <div className="flex-1 flex flex-col min-w-0">
        <motion.header 
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          className="border-b p-4 flex justify-between items-center bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/50"
        >
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
            <motion.div 
              animate={{ scale: isConnected ? 1 : 0.8 }}
              transition={{ type: "spring" }}
            >
              {isConnected ? (
                <Wifi className="h-4 w-4 text-green-500 hidden sm:block" />
              ) : (
                <WifiOff className="h-4 w-4 text-destructive animate-pulse hidden sm:block" />
              )}
            </motion.div>
          </div>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Button
              variant="ghost"
              size="icon"
              onClick={() => logoutMutation.mutate()}
              className="hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </motion.header>

        <ScrollArea ref={scrollRef} className="flex-1 p-2 sm:p-4">
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <motion.div
                key={message.id}
                variants={messageVariants}
                initial="initial"
                animate="animate"
                exit="exit"
                layout
                className={`flex gap-2 mb-4 ${
                  message.senderId === user?.id ? "justify-end" : "justify-start"
                }`}
              >
                {message.senderId !== user?.id && message.senderId && (
                  <Avatar className="h-8 w-8 hidden sm:block shrink-0">
                    <AvatarImage src={`https://images.unsplash.com/photo-${1708860028064 + message.senderId}-3303a016e88f`} />
                  </Avatar>
                )}
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  className={`max-w-[85%] sm:max-w-[70%] ${
                    message.senderId === user?.id
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted"
                  } rounded-lg p-3 shadow-sm`}
                >
                  <p className="break-words">{message.content}</p>
                  <span className="text-xs opacity-70">
                    {format(new Date(message.createdAt!), "HH:mm")}
                  </span>
                </motion.div>
              </motion.div>
            ))}
          </AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              className="ml-4"
            >
              <TypingIndicator />
            </motion.div>
          )}
        </ScrollArea>

        <Card className="m-2 sm:m-4 bg-card/80 backdrop-blur supports-[backdrop-filter]:bg-card/50">
          <form onSubmit={handleSend} className="flex gap-2 p-2">
            <Input
              ref={inputRef}
              value={newMessage}
              onChange={handleTyping}
              placeholder={`Message ${selectedUser ? selectedUser.username : 'everyone'}...`}
              className="flex-1 bg-background/50"
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
            <Button 
              type="submit" 
              size="icon"
              disabled={!isConnected}
              className="bg-primary hover:bg-primary/90"
            >
              <Send className="h-5 w-5" />
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}