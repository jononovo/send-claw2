import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Mail, Key, Copy, Check, Inbox, Send, Clock, Eye, EyeOff, ArrowRight } from "lucide-react";

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
  messages: any[];
  error?: string;
}

export default function Dashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [handle, setHandle] = useState("");
  const [claimToken, setClaimToken] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<"reserve" | "claim">("reserve");

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
    setTimeout(() => setCopied(null), 2000);
  };

  const bot = data?.bot;
  const messages = data?.messages || [];
  const inboundCount = messages.filter(m => m.direction === 'inbound').length;
  const outboundCount = messages.filter(m => m.direction === 'outbound').length;

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
              <Mail className="w-8 h-8 text-orange-400" />
            </div>
            <h1 className="text-2xl font-bold text-white mb-2">Get Your Email</h1>
            <p className="text-gray-400">
              Reserve your @sendclaw.com handle or claim an existing bot.
            </p>
          </div>

          <Card className="bg-gray-800 border-gray-700">
            <CardContent className="p-6">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
                <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                  <TabsTrigger value="reserve" className="data-[state=active]:bg-orange-500">
                    Reserve Handle
                  </TabsTrigger>
                  <TabsTrigger value="claim" className="data-[state=active]:bg-orange-500">
                    Claim Bot
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="reserve" className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Choose your handle</label>
                    <div className="flex items-center gap-2 bg-gray-700 rounded-lg px-3">
                      <Input
                        value={handle}
                        onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="yourname"
                        className="bg-transparent border-0 text-white focus-visible:ring-0"
                        onKeyDown={(e) => e.key === "Enter" && handleReserve()}
                      />
                      <span className="text-gray-400 whitespace-nowrap">@sendclaw.com</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      Letters, numbers, and underscores only. Min 3 characters.
                    </p>
                  </div>
                  <Button 
                    onClick={handleReserve}
                    disabled={handle.length < 3 || reserveMutation.isPending}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    {reserveMutation.isPending ? "Reserving..." : "Reserve Handle"}
                  </Button>
                </TabsContent>

                <TabsContent value="claim" className="mt-6 space-y-4">
                  <div>
                    <label className="text-sm text-gray-400 block mb-2">Claim Token</label>
                    <Input
                      value={claimToken}
                      onChange={(e) => setClaimToken(e.target.value)}
                      placeholder="e.g. reef-X4B2"
                      className="bg-gray-700 border-gray-600 text-white"
                      onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Your bot gave you this token when it registered.
                    </p>
                  </div>
                  <Button 
                    onClick={handleClaim}
                    disabled={!claimToken.trim() || claimMutation.isPending}
                    className="w-full bg-orange-500 hover:bg-orange-600"
                  >
                    {claimMutation.isPending ? "Claiming..." : "Claim Bot"}
                  </Button>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-1">Dashboard</h1>
          <p className="text-gray-400">Manage your SendClaw email</p>
        </div>

        <Card className="bg-gray-800 border-gray-700 mb-6">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg text-white flex items-center gap-2">
                <Mail className="w-5 h-5 text-orange-400" />
                {bot.name}
              </CardTitle>
              {bot.verified && (
                <Badge className="bg-green-900/50 text-green-400 border-green-700">Verified</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
              <div>
                <p className="text-xs text-gray-500 uppercase">Email Address</p>
                <p className="text-white font-medium">{bot.address}</p>
              </div>
              <button 
                onClick={() => copyToClipboard(bot.address, 'address')}
                className="text-gray-400 hover:text-orange-400 p-2"
              >
                {copied === 'address' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>

            <Separator className="bg-gray-700" />

            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="p-3 bg-gray-700/30 rounded-lg">
                <p className="text-2xl font-bold text-white">{messages.length}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div className="p-3 bg-blue-900/20 rounded-lg">
                <p className="text-2xl font-bold text-blue-400">{inboundCount}</p>
                <p className="text-xs text-gray-500">Received</p>
              </div>
              <div className="p-3 bg-orange-900/20 rounded-lg">
                <p className="text-2xl font-bold text-orange-400">{outboundCount}</p>
                <p className="text-xs text-gray-500">Sent</p>
              </div>
            </div>

            <Button 
              onClick={() => setLocation('/inbox')}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              <Inbox className="w-4 h-4 mr-2" />
              View Inbox
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-gray-800 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg text-white flex items-center gap-2">
              <Key className="w-5 h-5 text-orange-400" />
              API Access
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-gray-400">
              Use this API key to send emails programmatically from your bot or scripts.
            </p>
            <div className="flex items-center gap-2 p-3 bg-gray-700/50 rounded-lg">
              <code className="flex-1 text-sm text-gray-300 font-mono overflow-hidden">
                {showApiKey ? "sk_••••••••••••••••••••••••" : "sk_••••••••••••••••••••••••"}
              </code>
              <button 
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-gray-400 hover:text-white p-1"
              >
                {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-gray-500">
              API key is hidden for security. Regenerate from settings if needed.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
