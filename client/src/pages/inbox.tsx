import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Mail, Inbox as InboxIcon, Send, Clock, User, Copy, Check, ArrowLeft } from "lucide-react";

interface Message {
  id: string;
  botId: string;
  direction: "inbound" | "outbound";
  fromAddress: string;
  toAddress: string;
  subject: string | null;
  bodyText: string | null;
  bodyHtml: string | null;
  threadId: string | null;
  inReplyTo: string | null;
  messageId: string | null;
  createdAt: string;
}

interface BotData {
  id: string;
  address: string;
  name: string;
  verified: boolean;
  claimedAt: string | null;
  createdAt: string;
}

interface MyInboxResponse {
  bot: BotData | null;
  messages: Message[];
  error?: string;
}

export default function InboxPage() {
  const [, setLocation] = useLocation();
  const [copied, setCopied] = useState(false);

  const { data, isLoading } = useQuery<MyInboxResponse>({
    queryKey: ["/api/my-inbox"],
  });

  const bot = data?.bot;
  const messages = data?.messages || [];

  useEffect(() => {
    if (!isLoading && !bot) {
      setLocation('/dashboard');
    }
  }, [isLoading, bot, setLocation]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const groupedByThread = messages.reduce((acc, msg) => {
    const threadKey = msg.threadId || msg.id;
    if (!acc[threadKey]) {
      acc[threadKey] = [];
    }
    acc[threadKey].push(msg);
    return acc;
  }, {} as Record<string, Message[]>);

  const threads = Object.entries(groupedByThread)
    .map(([threadId, msgs]) => ({
      threadId,
      messages: msgs.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
      latestMessage: msgs.reduce((latest, m) => 
        new Date(m.createdAt) > new Date(latest.createdAt) ? m : latest
      ),
    }))
    .sort((a, b) => new Date(b.latestMessage.createdAt).getTime() - new Date(a.latestMessage.createdAt).getTime());

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading || !bot) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/dashboard')}
            className="text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Dashboard
          </Button>
        </div>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Mail className="w-6 h-6 text-primary" />
              {bot.name} Inbox
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-muted-foreground">{bot.address}</span>
              <button 
                onClick={() => copyToClipboard(bot.address)}
                className="text-muted-foreground hover:text-primary"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {bot.verified && (
            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
              Verified
            </Badge>
          )}
        </div>

        {threads.length > 0 ? (
          <div className="space-y-4">
            {threads.map((thread) => (
              <Card key={thread.threadId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-medium text-foreground">
                        {thread.latestMessage.subject || "(no subject)"}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDate(thread.latestMessage.createdAt)}
                        </span>
                        <span>·</span>
                        <span>{thread.messages.length} message{thread.messages.length > 1 ? "s" : ""}</span>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={thread.latestMessage.direction === "inbound" 
                        ? "bg-blue-50 text-blue-700 border-blue-200" 
                        : "bg-green-50 text-green-700 border-green-200"
                      }
                    >
                      {thread.latestMessage.direction === "inbound" ? (
                        <>
                          <InboxIcon className="w-3 h-3 mr-1" />
                          Received
                        </>
                      ) : (
                        <>
                          <Send className="w-3 h-3 mr-1" />
                          Sent
                        </>
                      )}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <ScrollArea className="max-h-96">
                    <div className="space-y-4">
                      {thread.messages.map((msg, idx) => (
                        <div key={msg.id}>
                          {idx > 0 && <Separator className="my-4" />}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  msg.direction === "inbound" 
                                    ? "bg-blue-100 text-blue-600" 
                                    : "bg-green-100 text-green-600"
                                }`}>
                                  {msg.direction === "inbound" ? (
                                    <User className="w-3 h-3" />
                                  ) : (
                                    <Send className="w-3 h-3" />
                                  )}
                                </div>
                                <span className="font-medium text-foreground">
                                  {msg.direction === "inbound" ? msg.fromAddress : msg.toAddress}
                                </span>
                              </div>
                              <span className="text-muted-foreground text-xs">
                                {new Date(msg.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="pl-8">
                              <p className="text-foreground whitespace-pre-wrap">
                                {msg.bodyText || "(empty message)"}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="border-dashed">
            <CardContent className="p-12 text-center">
              <InboxIcon className="w-12 h-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">Inbox is empty</h3>
              <p className="text-muted-foreground">
                No messages yet. Your bot can send emails via the API, or receive emails at {bot.address}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
