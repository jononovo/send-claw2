import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Mail, Key, Copy, Check, Inbox, Send, Eye, EyeOff, ArrowRight, Pencil, Save, Bot, Shield, Link2, RefreshCw } from "lucide-react";

interface HandleData {
  id: string;
  address: string;
  senderName: string | null;
  reservedAt: string | null;
  botId: string | null;
}

interface BotData {
  id: string;
  name: string;
  senderName: string;
  verified: boolean;
  claimedAt: string | null;
  createdAt: string;
  apiKey: string | null;
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
  const [senderName, setSenderName] = useState("");
  const [isEditingSenderName, setIsEditingSenderName] = useState(false);
  const [handleSenderName, setHandleSenderName] = useState("");
  const [isEditingHandleSenderName, setIsEditingHandleSenderName] = useState(false);
  const [claimToken, setClaimToken] = useState("");
  const [copied, setCopied] = useState<string | null>(null);
  const [regeneratedKey, setRegeneratedKey] = useState<{ apiKey: string; pasteMessage: string; botName: string } | null>(null);
  const [showApiKey, setShowApiKey] = useState(false);

  const { data, isLoading, refetch } = useQuery<MyInboxResponse>({
    queryKey: ["/api/my-inbox"],
  });

  const reserveMutation = useMutation({
    mutationFn: async (handleName: string) => {
      const res = await apiRequest("POST", "/api/bots/reserve", { handle: handleName });
      return res.json();
    },
    onSuccess: async (data) => {
      if (handleSenderName.trim() && data.id) {
        try {
          await apiRequest("PATCH", `/api/handles/${data.id}/sender-name`, { senderName: handleSenderName.trim() });
        } catch (e) {
          console.error("Failed to save sender name:", e);
        }
      }
      toast({
        title: "Handle saved!",
        description: `Your email is now ${data.address}`,
      });
      setHandle("");
      setHandleSenderName("");
      setIsEditingHandle(false);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Save failed",
        description: error.message || "Could not save handle",
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

  const senderNameMutation = useMutation({
    mutationFn: async ({ botId, senderName }: { botId: string; senderName: string }) => {
      const res = await apiRequest("PATCH", `/api/bots/${botId}/sender-name`, { senderName });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sender name updated!",
        description: "Your display name has been saved",
      });
      setSenderName("");
      setIsEditingSenderName(false);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update sender name",
        variant: "destructive",
      });
    },
  });

  const handleSenderNameMutation = useMutation({
    mutationFn: async ({ handleId, senderName }: { handleId: string; senderName: string }) => {
      const res = await apiRequest("PATCH", `/api/handles/${handleId}/sender-name`, { senderName });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Sender name updated!",
        description: "Your display name has been saved",
      });
      setHandleSenderName("");
      setIsEditingHandleSenderName(false);
      refetch();
    },
    onError: (error: any) => {
      toast({
        title: "Update failed",
        description: error.message || "Could not update sender name",
        variant: "destructive",
      });
    },
  });

  const regenerateKeyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/bots/regenerate-key");
      return res.json();
    },
    onSuccess: (data) => {
      setRegeneratedKey({
        apiKey: data.apiKey,
        pasteMessage: data.pasteMessage,
        botName: data.botName
      });
      refetch();
      toast({
        title: "API key regenerated",
        description: `New key generated for ${data.botName}. Copy it now — it won't be shown again.`,
      });
    },
    onError: (error: any) => {
      toast({
        title: "Regeneration failed",
        description: error.message || "Could not regenerate API key",
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

  const handleSenderNameSave = () => {
    if (senderName.trim() && userBot?.id) {
      senderNameMutation.mutate({ botId: userBot.id, senderName: senderName.trim() });
    }
  };

  const handleHandleSenderNameSave = () => {
    if (handleSenderName.trim() && userHandle?.id) {
      handleSenderNameMutation.mutate({ handleId: userHandle.id, senderName: handleSenderName.trim() });
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
                      setHandleSenderName(userHandle.senderName || "");
                      setIsEditingHandle(true);
                    }}
                  >
                    <Pencil className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                )}
              </div>
              <CardDescription>
                {hasHandle ? "Your SendClaw email identity" : "Reserve your @sendclaw.com handle"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {hasHandle && !isEditingHandle ? (
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Email Address</p>
                    <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <span className="font-medium text-foreground">{userHandle.address}</span>
                      <button 
                        onClick={() => copyToClipboard(userHandle.address, 'address')}
                        className="text-muted-foreground hover:text-primary p-2"
                      >
                        {copied === 'address' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Sender Name</p>
                    <div className="p-3 bg-muted rounded-lg">
                      <span className="font-medium text-foreground">
                        {userHandle.senderName || <span className="text-muted-foreground italic">Not set</span>}
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Email Address</p>
                    <div className="flex items-center gap-2 bg-muted rounded-lg px-3">
                      <Input
                        value={handle}
                        onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                        placeholder="yourname"
                        className="bg-transparent border-0 focus-visible:ring-0"
                        disabled={!!userHandle}
                      />
                      <span className="text-muted-foreground whitespace-nowrap">@sendclaw.com</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {userHandle 
                        ? "Email handles cannot be changed once reserved."
                        : "Letters, numbers, and underscores only. Min 3 characters."}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Sender Name</p>
                    <Input
                      value={handleSenderName}
                      onChange={(e) => setHandleSenderName(e.target.value)}
                      placeholder="e.g., John Smith"
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This is what recipients see as the "From" name.
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={() => {
                        if (userHandle) {
                          // Existing handle - update sender name only
                          const newName = handleSenderName.trim();
                          const originalName = userHandle.senderName || "";
                          if (newName && newName !== originalName) {
                            handleSenderNameMutation.mutate({ 
                              handleId: userHandle.id, 
                              senderName: newName 
                            }, {
                              onSuccess: () => setIsEditingHandle(false)
                            });
                          } else if (!newName) {
                            toast({
                              title: "Sender name required",
                              description: "Please enter a sender name",
                              variant: "destructive",
                            });
                          } else {
                            // No changes made, just close
                            setIsEditingHandle(false);
                          }
                        } else if (handle.trim().length >= 3) {
                          // New handle - create reservation
                          reserveMutation.mutate(handle.trim());
                        }
                      }}
                      disabled={
                        userHandle 
                          ? handleSenderNameMutation.isPending
                          : (handle.length < 3 || reserveMutation.isPending)
                      }
                      className="flex-1"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      {reserveMutation.isPending || handleSenderNameMutation.isPending ? "Saving..." : "Save"}
                    </Button>
                    {isEditingHandle && (
                      <Button 
                        variant="outline"
                        onClick={() => {
                          setIsEditingHandle(false);
                          setHandle("");
                          setHandleSenderName("");
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

          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-primary" />
                <CardTitle className="text-lg">API for Agents / Bots</CardTitle>
              </div>
                <CardDescription>
                  Your bot uses this key to authenticate with the SendClaw API
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {userBot?.apiKey && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1">API Key</p>
                      <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                        <code className="text-sm font-mono text-foreground">
                          {showApiKey ? userBot.apiKey : `${userBot.apiKey.slice(0, 8)}${'•'.repeat(24)}`}
                        </code>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setShowApiKey(!showApiKey)}
                            className="text-muted-foreground hover:text-primary p-2"
                          >
                            {showApiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => copyToClipboard(userBot.apiKey!, 'apiKey')}
                            className="text-muted-foreground hover:text-primary p-2"
                          >
                            {copied === 'apiKey' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {regeneratedKey ? (
                    <div className="space-y-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <p className="text-sm font-medium text-green-800">
                        New key generated — paste this message into your chat with your bot:
                      </p>
                      <div className="relative">
                        <pre className="text-xs bg-white p-3 rounded border border-green-200 whitespace-pre-wrap break-all text-foreground">
                          {regeneratedKey.pasteMessage}
                        </pre>
                        <Button
                          size="sm"
                          variant="outline"
                          className="absolute top-2 right-2"
                          onClick={() => copyToClipboard(regeneratedKey.pasteMessage, "pasteMessage")}
                        >
                          {copied === "pasteMessage" ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => copyToClipboard(regeneratedKey.apiKey, "regeneratedApiKey")}
                        >
                          {copied === "regeneratedApiKey" ? <Check className="w-3 h-3 mr-1" /> : <Key className="w-3 h-3 mr-1" />}
                          Copy key only
                        </Button>
                        <p className="text-xs text-muted-foreground">This key won't be shown again after you leave this page.</p>
                      </div>
                    </div>
                  ) : (
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full" disabled={regenerateKeyMutation.isPending}>
                          <RefreshCw className={`w-3 h-3 mr-1 ${regenerateKeyMutation.isPending ? 'animate-spin' : ''}`} />
                          {regenerateKeyMutation.isPending ? "Regenerating..." : "Regenerate API Key"}
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Regenerate API Key?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will create a new API key for {userBot?.name}. The old key will stop working immediately.
                            Only do this if your bot lost its key or you suspect it was compromised.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => regenerateKeyMutation.mutate()}>
                            Regenerate Key
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )}
                </div>
              </CardContent>
            </Card>

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
              >
                <Inbox className="w-4 h-4 mr-2" />
                View Inbox
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
