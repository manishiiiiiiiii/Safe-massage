import { User } from "@shared/schema";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Users, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { format } from "date-fns";

interface ChatSidebarProps {
  onSelectUser: (user: User) => void;
  selectedUserId?: number;
}

export function ChatSidebar({ onSelectUser, selectedUserId }: ChatSidebarProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const { data: users = [] } = useQuery<User[]>({
    queryKey: ["/api/users/online"],
  });

  return (
    <motion.div
      initial={{ width: "320px" }}
      animate={{ width: isExpanded ? "320px" : "80px" }}
      transition={{ type: "spring", stiffness: 200, damping: 25 }}
      className="bg-card border-r h-full relative"
    >
      <Button
        variant="ghost"
        size="icon"
        className="absolute -right-4 top-4 z-10"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        {isExpanded ? (
          <ChevronLeft className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>

      <div className="p-4 border-b flex items-center gap-3">
        <Users className="h-5 w-5" />
        <AnimatePresence>
          {isExpanded && (
            <motion.h2
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-semibold"
            >
              Online Users
            </motion.h2>
          )}
        </AnimatePresence>
      </div>

      <ScrollArea className="h-[calc(100vh-5rem)]">
        <AnimatePresence>
          {users.map((user) => (
            <motion.button
              key={user.id}
              layout
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              onClick={() => onSelectUser(user)}
              className={cn(
                "w-full p-4 flex items-center gap-3 hover:bg-accent/50 transition-colors",
                selectedUserId === user.id && "bg-accent"
              )}
            >
              <div className="relative">
                <Avatar>
                  <AvatarImage src={user.avatarUrl || undefined} />
                </Avatar>
                {user.isOnline && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-background" />
                )}
              </div>
              {isExpanded && (
                <div className="flex-1 text-left">
                  <p className="font-medium">{user.username}</p>
                  {!user.isOnline && user.lastSeen && (
                    <p className="text-xs text-muted-foreground">
                      Last seen {format(new Date(user.lastSeen), "HH:mm")}
                    </p>
                  )}
                </div>
              )}
            </motion.button>
          ))}
        </AnimatePresence>
      </ScrollArea>
    </motion.div>
  );
}