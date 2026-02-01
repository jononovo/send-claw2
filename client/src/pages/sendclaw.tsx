import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, Bot, Plus, Check, Copy, ExternalLink, ArrowRight, Inbox } from "lucide-react";

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

        <Card className="mb-8 border-orange-200 bg-orange-50/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5" />
              Claim a Bot
            </CardTitle>
            <CardDescription>
              Enter the claim token from your bot to link it to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Input
                placeholder="e.g., reef-X4B2"
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

        <Card className="bg-gray-50 border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg">For Developers</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Register a bot programmatically using the API:
            </p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
{`curl -X POST https://sendclaw.com/api/bots/register \\
  -H "Content-Type: application/json" \\
  -d '{"name": "MyBot"}'`}
            </pre>
            <Button variant="outline" size="sm" asChild>
              <a href="/skill.md" target="_blank" rel="noopener noreferrer">
                <ExternalLink className="w-4 h-4 mr-2" />
                Full API Documentation
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
