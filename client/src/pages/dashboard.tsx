import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Mail, Key, Copy, Check, Inbox, Send, Eye, EyeOff, ArrowRight, Pencil, Save, Bot, Shield, Link2 } from "lucide-react";

interface HandleData {
  id: string;
  address: string;
  reservedAt: string | null;
  botId: string | null;
}

interface BotData {
  id: string;
  name: string;
  verified: boolean;
  claimedAt: string | null;
  createdAt: string;
}

interface MyInboxResponse {
  handle: HandleData | null;
  bot: BotData | null;
  messages: any[];
  error?: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [handle, setHandle] = useState("");
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [claimToken, setClaimToken] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery<MyInboxResponse>({
    queryKey: ["/api/my-inbox"],
  });

  const reserveMutation = useMutation({
    mutationFn: async (handleName: string) => {
      const res = await apiRequest("POST", "/api/bots/reserve", { handle: handleName });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Handle reserved!",
        description: `Your email is now ${data.address}`,
      });
      setHandle("");
      setIsEditingHandle(false);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Reservation failed",
        description: error.message || "Could not reserve handle",
        variant: "destructive",
      });
    },
  });

  const claimMutation = useMutation({
    mutationFn: async (token: string) => {
      const res = await apiRequest("POST", "/api/bots/claim", { claimToken: token });
      return res.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Bot claimed!",
        description: `Successfully linked ${data.bot.name}`,
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

  const handleReserve = () => {
    if (handle.trim()) {
      reserveMutation.mutate(handle.trim());
    }
  };

  const handleClaim = () => {
    if (claimToken.trim()) {
      claimMutation.mutate(claimToken.trim());
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    toast({ title: "Copied to clipboard" });
    setTimeout(() => setCopied(null), 2000);
  };

  const userHandle = data?.handle;
  const userBot = data?.bot;
  const messages = data?.messages || [];
  const inboundCount = messages.filter(m => m.direction === 'inbound').length;
  const outboundCount = messages.filter(m => m.direction === 'outbound').length;
  
  const hasHandle = !!userHandle;
  const hasBot = !!userBot;
  const isLinked = hasHandle && userHandle.botId;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-1">Dashboard</h1>
          <p className="text-muted-foreground">Manage your SendClaw email</p>
        </div>

        <div className="space-y-6">
          {/* Handle Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-5 h-5 text-primary" />
                  <CardTitle className="text-lg">Email Handle</CardTitle>
                </div>
                {hasHandle && !isEditingHandle && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => {
                      setHandle(userHandle.address.replace(`@sendclaw.com`, '').split('@')[0]);
                      setIsEditingHandle(true);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              <CardDescription>
                {hasHandle ? "Your SendClaw email address" : "Reserve your @sendclaw.com handle"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasHandle && !isEditingHandle ? (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <span className="font-medium text-foreground">{userHandle.address}</span>
                  <button 
                    onClick={() => copyToClipboard(userHandle.address, 'address')}
                    className="text-muted-foreground hover:text-primary p-2"
                  >
                    {copied === 'address' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 bg-muted rounded-lg px-3">
                    <Input
                      value={handle}
                      onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                      placeholder="yourname"
                      className="bg-transparent border-0 focus-visible:ring-0"
                      onKeyDown={(e) => e.key === "Enter" && handleReserve()}
                    />
                    <span className="text-muted-foreground whitespace-nowrap">@sendclaw.com</span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Letters, numbers, and underscores only. Min 3 characters.
                  </p>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleReserve}
                      disabled={handle.length < 3 || reserveMutation.isPending}
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {reserveMutation.isPending ? "Saving..." : "Save Handle"}
                    </Button>
                    {isEditingHandle && (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setIsEditingHandle(false);
                          setHandle("");
                        }}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Bot Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Bot Connection</CardTitle>
              </div>
              <CardDescription>
                {hasBot ? "Your linked AI bot" : "Connect an AI bot to send emails"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasBot ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium text-foreground">{userBot.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Claimed {userBot.claimedAt ? new Date(userBot.claimedAt).toLocaleDateString() : 'recently'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {isLinked && (
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          <Link2 className="w-3 h-3 mr-1" />
                          Linked
                        </Badge>
                      )}
                      {userBot.verified && (
                        <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                          <Shield className="w-3 h-3 mr-1" />
                          Verified
                        </Badge>
                      )}
                    </div>
                  </div>
                  {!isLinked && hasHandle && (
                    <p className="text-sm text-amber-600 bg-amber-50 p-2 rounded">
                      Bot is claimed but not linked to your handle. This may happen if you reserved the handle after claiming.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  <Input
                    value={claimToken}
                    onChange={(e) => setClaimToken(e.target.value)}
                    placeholder="Enter claim token (e.g. reef-X4B2)"
                    onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                  />
                  <p className="text-xs text-muted-foreground">
                    Your AI bot provides this token when it registers via the API.
                  </p>
                  <Button 
                    onClick={handleClaim}
                    disabled={!claimToken.trim() || claimMutation.isPending}
                    className="w-full"
                  >
                    {claimMutation.isPending ? "Claiming..." : "Claim Bot"}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stats Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Inbox className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">Email Stats</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-2xl font-bold text-foreground">{messages.length}</p>
                  <p className="text-xs text-muted-foreground">Total</p>
                </div>
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{inboundCount}</p>
                  <p className="text-xs text-muted-foreground">Received</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{outboundCount}</p>
                  <p className="text-xs text-muted-foreground">Sent</p>
                </div>
              </div>

              <Separator className="my-4" />

              <Button 
                onClick={() => setLocation('/inbox')}
                variant="outline"
                className="w-full"
                disabled={!isLinked}
              >
                <Inbox className="w-4 h-4 mr-2" />
                View Inbox
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
              
              {!isLinked && (
                <p className="text-xs text-muted-foreground text-center mt-2">
                  {!hasHandle ? "Reserve a handle first" : !hasBot ? "Connect a bot first" : "Link your bot to your handle"}
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
