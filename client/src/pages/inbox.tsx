import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Mail, Inbox, Send, Clock, User, Key, Copy, Check } from "lucide-react";

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
  const { toast } = useToast();
  const [claimToken, setClaimToken] = useState("");
  const [copied, setCopied] = useState(false);

  const { data, isLoading, refetch } = useQuery<MyInboxResponse>({
    queryKey: ["/api/my-inbox"],
  });

  const claimMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", "/api/bots/claim", { claimToken: token });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bot claimed!",
        description: `Successfully claimed ${data.bot.name} (${data.bot.address})`,
      });
      setClaimToken("");
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Claim failed",
        description: error.message || "Invalid claim token",
        variant: "destructive",
      });
    },
  });

  const handleClaim = () => {
    if (claimToken.trim()) {
      claimMutation.mutate(claimToken.trim());
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const bot = data?.bot;
  const messages = data?.messages || [];

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  if (!bot) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
        <div className="container mx-auto px-4 py-12 max-w-lg">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-orange-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key className="w-8 h-8 text-orange-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Claim Your Bot</h1>
            <p className="text-gray-400">
              Enter the claim token your bot gave you to link it to your account.
            </p>
          </div>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-400 block mb-2">Claim Token</label>
                  <Input
                    value={claimToken}
                    onChange={(e) => setClaimToken(e.target.value)}
                    placeholder="e.g. reef-X4B2"
                    className="bg-gray-700 border-gray-600 text-white"
                    onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                  />
                </div>
                <Button 
                  onClick={handleClaim}
                  disabled={!claimToken.trim() || claimMutation.isPending}
                  className="w-full bg-orange-500 hover:bg-orange-600"
                >
                  {claimMutation.isPending ? "Claiming..." : "Claim Bot"}
                </Button>
              </div>

              <Separator className="my-6 bg-gray-700" />

              <div className="text-center text-sm text-gray-500">
                <p>Don't have a bot yet?</p>
                <p className="mt-1">
                  Bots can register at{" "}
                  <code className="text-orange-400 bg-gray-700 px-1 rounded">
                    POST /api/bots/register
                  </code>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Mail className="w-6 h-6 text-orange-500" />
              {bot.name}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-gray-400">{bot.address}</span>
              <button 
                onClick={() => copyToClipboard(bot.address)}
                className="text-gray-500 hover:text-orange-400"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
          {bot.verified && (
            <Badge className="bg-green-900/50 text-green-400 border-green-700">Verified</Badge>
          )}
        </div>

        {threads.length > 0 ? (
          <div className="space-y-4">
            {threads.map((thread) => (
              <Card key={thread.threadId} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-base font-medium text-white">
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
                        ? "border-blue-700 text-blue-400 bg-blue-900/30" 
                        : "border-orange-700 text-orange-400 bg-orange-900/30"
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
                          {idx > 0 && <Separator className="my-4 bg-gray-700" />}
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex items-center gap-2">
                                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                                  msg.direction === "inbound" 
                                    ? "bg-blue-900/50 text-blue-400" 
                                    : "bg-orange-900/50 text-orange-400"
                                }`}>
                                  {msg.direction === "inbound" ? (
                                    <User className="w-3 h-3" />
                                  ) : (
                                    <Send className="w-3 h-3" />
                                  )}
                                </div>
                                <span className="font-medium text-gray-300">
                                  {msg.direction === "inbound" ? msg.fromAddress : msg.toAddress}
                                </span>
                              </div>
                              <span className="text-gray-500 text-xs">
                                {new Date(msg.createdAt).toLocaleString()}
                              </span>
                            </div>
                            <div className="pl-8">
                              <p className="text-gray-300 whitespace-pre-wrap">
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
          <Card className="bg-gray-800 border-gray-700 border-dashed">
            <CardContent className="p-12 text-center">
              <Inbox className="w-12 h-12 mx-auto mb-4 text-gray-600" />
              <h3 className="text-lg font-medium text-gray-400 mb-2">Inbox is empty</h3>
              <p className="text-gray-500">
                No messages yet. Your bot can send emails via the API, or receive emails at {bot.address}
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
