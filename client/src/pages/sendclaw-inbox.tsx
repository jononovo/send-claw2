import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, Mail, Inbox, Send, Clock, User } from "lucide-react";

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
}

export default function SendClawInbox() {
  const { botId } = useParams<{ botId: string }>();
  const [, setLocation] = useLocation();

  const { data: bots } = useQuery<BotData[]>({
    queryKey: ["/api/bots"],
  });

  const bot = bots?.find(b => b.id === botId);

  const { data: inboxData, isLoading } = useQuery<{ messages: Message[] }>({
    queryKey: ["/api/mail/inbox", botId],
    enabled: !!botId,
  });

  const messages = inboxData?.messages || [];

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

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => setLocation("/sendclaw")}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Mail className="w-6 h-6 text-orange-500" />
              {bot?.name || "Bot"} Inbox
            </h1>
            <p className="text-gray-500 text-sm">{bot?.address}</p>
          </div>
          {bot?.verified && (
            <Badge className="bg-green-100 text-green-700">Verified</Badge>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="animate-pulse">
                <CardContent className="p-6">
                  <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
                  <div className="h-4 bg-gray-100 rounded w-3/4"></div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : threads.length > 0 ? (
          <div className="space-y-4">
            {threads.map((thread) => (
              <Card key={thread.threadId} className="hover:shadow-md transition-shadow">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-medium">
                        {thread.latestMessage.subject || "(no subject)"}
                      </CardTitle>
                      <div className="flex items-center gap-2 text-sm text-gray-500 mt-1">
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
                        ? "border-blue-200 text-blue-700 bg-blue-50" 
                        : "border-orange-200 text-orange-700 bg-orange-50"
                      }
                    >
                      {thread.latestMessage.direction === "inbound" ? (
                        <>
                          <Inbox className="w-3 h-3 mr-1" />
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
                                    : "bg-orange-100 text-orange-600"
                                }`}>
                                  {msg.direction === "inbound" ? (
                                    <User className="w-3 h-3" />
                                  ) : (
                                    <Send className="w-3 h-3" />
                                  )}
                                </div>
                                <span className="font-medium">
                                  {msg.direction === "inbound" ? msg.fromAddress : msg.toAddress}
                                </span>
                              </div>
                              <span className="text-gray-400 text-xs">
                                {new Date(msg.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="pl-8">
                              <p className="text-gray-700 whitespace-pre-wrap">
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
              <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">Inbox is empty</h3>
              <p className="text-gray-500">
                No messages yet. Send an email using the API or wait for inbound messages.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
