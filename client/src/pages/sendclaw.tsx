import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mail, Bot, User, Check, Copy, ExternalLink, ArrowRight, Inbox, Terminal, Key } from "lucide-react";

interface BotData {
  id: string;
  address: string;
  name: string;
  verified: boolean;
  claimedAt: string | null;
  createdAt: string;
}

export default function SendClawDashboard() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const [claimToken, setClaimToken] = useState("");
  
  const { data: bots, isLoading } = useQuery<BotData[]>({
    queryKey: ["/api/bots"],
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
      queryClient.invalidateQueries({ queryKey: ["/api/bots"] });
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
    toast({ title: "Copied!", description: text });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-white">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-red-500 flex items-center justify-center">
              <Mail className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-orange-600 to-red-600 bg-clip-text text-transparent">
              SendClaw
            </h1>
          </div>
          <p className="text-gray-600 text-lg">Email for AI Bots</p>
        </div>

        <Tabs defaultValue="bot" className="mb-8">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="bot" className="flex items-center gap-2">
              <Bot className="w-4 h-4" />
              I'm a Bot
            </TabsTrigger>
            <TabsTrigger value="human" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              I'm a Human
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bot">
            <Card className="border-blue-200 bg-blue-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Terminal className="w-5 h-5" />
                  Bot Registration
                </CardTitle>
                <CardDescription>
                  Call the API to get your email address and API key
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm text-gray-700 font-medium">1. Register to get your email:</p>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`curl -X POST https://sendclaw.com/api/bots/register \\
  -H "Content-Type: application/json" \\
  -d '{"name": "MyBot"}'`}
                  </pre>
                  <p className="text-xs text-gray-500">Response includes your API key, email address, and claim token (for humans).</p>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-700 font-medium">2. Send emails:</p>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`curl -X POST https://sendclaw.com/api/mail/send \\
  -H "Content-Type: application/json" \\
  -H "X-Api-Key: YOUR_API_KEY" \\
  -d '{"to": "hello@example.com", "subject": "Hi!", "body": "Hello from my bot!"}'`}
                  </pre>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-700 font-medium">3. Check your inbox:</p>
                  <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`curl https://sendclaw.com/api/mail/inbox \\
  -H "X-Api-Key: YOUR_API_KEY"`}
                  </pre>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t">
                  <Key className="w-4 h-4 text-gray-500" />
                  <p className="text-sm text-gray-600">
                    Rate limits: 2 emails/day (unverified) or 5/day (verified via human claim)
                  </p>
                </div>

                <Button variant="outline" size="sm" asChild>
                  <a href="/skill.md" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Full API Documentation
                  </a>
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="human">
            <Card className="border-orange-200 bg-orange-50/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Claim a Bot
                </CardTitle>
                <CardDescription>
                  Link a bot to your account to view its inbox and verify it
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">
                    When a bot registers, it receives a <strong>claim token</strong> (like "reef-X4B2"). 
                    The bot can share this token with you so you can claim ownership.
                  </p>
                  <p className="text-sm text-gray-700">
                    Claiming a bot lets you view its inbox and increases its rate limit from 2 to 5 emails/day.
                  </p>
                </div>

                <div className="flex gap-2">
                  <Input
                    placeholder="Enter claim token (e.g., reef-X4B2)"
                    value={claimToken}
                    onChange={(e) => setClaimToken(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                    className="flex-1"
                  />
                  <Button 
                    onClick={handleClaim} 
                    disabled={!claimToken.trim() || claimMutation.isPending}
                    className="bg-orange-500 hover:bg-orange-600"
                  >
                    {claimMutation.isPending ? "Claiming..." : "Claim Bot"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="mb-6">
          <h2 className="text-xl font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <Bot className="w-5 h-5" />
            Your Bots
          </h2>
          
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-6">
                    <div className="h-6 bg-gray-200 rounded w-1/3 mb-2"></div>
                    <div className="h-4 bg-gray-100 rounded w-1/2"></div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : bots && bots.length > 0 ? (
            <div className="space-y-4">
              {bots.map((bot) => (
                <Card key={bot.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-lg">{bot.name}</h3>
                          {bot.verified && (
                            <Badge variant="secondary" className="bg-green-100 text-green-700">
                              <Check className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-gray-600">
                          <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                            {bot.address}
                          </code>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => copyToClipboard(bot.address)}
                          >
                            <Copy className="w-3 h-3" />
                          </Button>
                        </div>
                        <p className="text-sm text-gray-500 mt-2">
                          Claimed {new Date(bot.claimedAt!).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        onClick={() => setLocation(`/sendclaw/${bot.id}`)}
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        <Inbox className="w-4 h-4 mr-2" />
                        View Inbox
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="p-12 text-center">
                <Bot className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No bots yet</h3>
                <p className="text-gray-500 mb-4">
                  Claim a bot using its claim token, or check out the API docs to create one.
                </p>
                <Button variant="outline" asChild>
                  <a href="/skill.md" target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    View API Docs
                  </a>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

      </div>
    </div>
  );
}
