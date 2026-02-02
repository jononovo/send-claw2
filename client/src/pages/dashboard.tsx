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
import { Mail, Key, Copy, Check, Inbox, Send, Eye, EyeOff, ArrowRight, Pencil, Save, Bot, Shield } from "lucide-react";

interface BotData {
  id: string;
  address: string;
  name: string;
  verified: boolean;
  claimedAt: string | null;
  createdAt: string;
  apiKey?: string;
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
  const [isEditingHandle, setIsEditingHandle] = useState(false);
  const [claimToken, setClaimToken] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

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

  const bot = data?.bot;
  const messages = data?.messages || [];
  const inboundCount = messages.filter(m => m.direction === 'inbound').length;
  const outboundCount = messages.filter(m => m.direction === 'outbound').length;
  const hasHandle = !!bot?.address;

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
                      setHandle(bot.address.replace('@sendclaw.com', ''));
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
                  <span className="font-medium text-foreground">{bot.address}</span>
                  <button 
                    onClick={() => copyToClipboard(bot.address, 'address')}
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
                <CardTitle className="text-lg">Bot Details</CardTitle>
              </div>
              <CardDescription>
                {bot?.claimedAt ? "Your linked bot" : "Claim a bot using its token"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {bot?.claimedAt ? (
                <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                  <div>
                    <p className="font-medium text-foreground">{bot.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Claimed {new Date(bot.claimedAt).toLocaleDateString()}
                    </p>
                  </div>
                  {bot.verified && (
                    <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
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
                    Your bot provided this token when it registered via the API.
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
                disabled={!hasHandle}
              >
                <Inbox className="w-4 h-4 mr-2" />
                View Inbox
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>

          {/* API Key Section */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">API Access</CardTitle>
              </div>
              <CardDescription>
                Use this key to send emails programmatically
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasHandle ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
                    <code className="flex-1 text-sm font-mono text-muted-foreground overflow-hidden">
                      {showApiKey ? (bot.apiKey || "sk_••••••••••••••••") : "sk_••••••••••••••••••••••••"}
                    </code>
                    <button 
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="text-muted-foreground hover:text-foreground p-1"
                    >
                      {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    API key is hidden for security. Contact support if you need to regenerate.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-3 bg-muted rounded-lg">
                  Reserve a handle first to get your API key.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
