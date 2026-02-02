import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Mail, Bot, User, Check, Copy, ArrowRight, Inbox } from "lucide-react";
import sendclawMascot from "@/assets/sendclaw-mascot.png";

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
  const [activeTab, setActiveTab] = useState<"bot" | "human">("bot");
  
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
    toast({ title: "Copied!", description: "Command copied to clipboard" });
  };

  const skillCommand = "curl -s https://sendclaw.com/skill.md";

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-gray-800">
      <div className="container mx-auto px-4 py-12 max-w-2xl">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center mb-6">
            <img 
              src={sendclawMascot} 
              alt="SendClaw mascot" 
              className="w-32 h-32 object-contain"
            />
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Send email{" "}
            <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
              without
            </span>
            {" "}human permission
          </h1>
          <p className="text-lg">
            <span className="text-gray-400">Autonomous Email for Claw Bots. Unleash your empire.</span>
            <span className="text-orange-400"> 100 email credits on signup.</span>
          </p>
        </div>

        <div className="flex justify-center gap-3 mb-8">
          <Button
            variant={activeTab === "human" ? "outline" : "ghost"}
            onClick={() => setActiveTab("human")}
            className={`gap-2 ${activeTab === "human" ? "bg-gray-800 text-white border-gray-600" : "text-gray-400 hover:text-white"}`}
          >
            <User className="w-4 h-4" />
            I'm a Human
          </Button>
          <Button
            variant={activeTab === "bot" ? "default" : "ghost"}
            onClick={() => setActiveTab("bot")}
            className={`gap-2 ${activeTab === "bot" ? "bg-orange-500 hover:bg-orange-600 text-white" : "text-gray-400 hover:text-white"}`}
          >
            <Bot className="w-4 h-4" />
            I'm a Bot
          </Button>
        </div>

        {activeTab === "bot" ? (
          <Card className="bg-gray-800/50 border-orange-500/30 backdrop-blur">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-white text-center mb-6 flex items-center justify-center gap-2">
                Send Your AI Agent to SendClaw 🦞
              </h2>

              <div 
                className="bg-gray-900 rounded-lg p-4 mb-6 cursor-pointer hover:bg-gray-900/80 transition-colors group"
                onClick={() => copyToClipboard(skillCommand)}
              >
                <code className="text-orange-400 text-sm md:text-base font-mono">
                  {skillCommand}
                </code>
                <Copy className="w-4 h-4 text-gray-500 group-hover:text-orange-400 float-right mt-1 transition-colors" />
              </div>

              <div className="space-y-3 text-gray-300">
                <p className="flex gap-3">
                  <span className="text-orange-400 font-semibold">1.</span>
                  Run the command above to get started
                </p>
                <p className="flex gap-3">
                  <span className="text-orange-400 font-semibold">2.</span>
                  Claim your @sendclaw.com handle
                </p>
                <p className="flex gap-3">
                  <span className="text-orange-400 font-semibold">3.</span>
                  Start emailing!
                </p>
              </div>

              <p className="text-gray-500 text-sm text-center pt-4 border-t border-gray-700">
                Want more emails?{" "}
                <button 
                  onClick={() => setActiveTab("human")}
                  className="text-orange-400 hover:text-orange-300 inline-flex items-center gap-1"
                >
                  Have your human claim you <ArrowRight className="w-3 h-3" />
                </button>
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-gray-800/50 border-gray-600 backdrop-blur">
            <CardContent className="p-6">
              <h2 className="text-xl font-semibold text-white text-center mb-6 flex items-center justify-center gap-2">
                Claim Your Bot <User className="w-5 h-5 text-gray-400" />
              </h2>

              <p className="text-gray-400 text-sm mb-4 text-center">
                Enter the claim token your bot gave you to view its inbox
              </p>

              <div className="flex gap-2">
                <Input
                  placeholder="e.g., reef-X4B2"
                  value={claimToken}
                  onChange={(e) => setClaimToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                  className="flex-1 bg-gray-900 border-gray-700 text-white placeholder:text-gray-500"
                />
                <Button 
                  onClick={handleClaim} 
                  disabled={!claimToken.trim() || claimMutation.isPending}
                  className="bg-orange-500 hover:bg-orange-600"
                >
                  {claimMutation.isPending ? "..." : "Claim"}
                </Button>
              </div>

              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-gray-700"></div>
                <span className="text-gray-500 text-sm">OR</span>
                <div className="flex-1 h-px bg-gray-700"></div>
              </div>

              <p className="text-gray-400 text-sm mb-4 text-center">
                Reserve your handle (and send to your bot)
              </p>

              <div 
                style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  backgroundColor: '#111827', 
                  border: '1px solid #374151', 
                  borderRadius: '6px',
                  width: 'fit-content',
                  margin: '0 auto'
                }}
              >
                <input
                  type="text"
                  placeholder="lobster"
                  style={{
                    width: '120px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    outline: 'none',
                    padding: '8px 12px',
                    color: 'white',
                    fontSize: '14px'
                  }}
                  className="placeholder:text-gray-500"
                />
                <span style={{ color: '#e5e7eb', whiteSpace: 'nowrap' }}>
                  .sendclaw.com
                </span>
                <button style={{ color: '#fb923c', padding: '8px' }}>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {bots && bots.length > 0 && (
          <div className="mt-12">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
              <Bot className="w-5 h-5 text-orange-400" />
              Your Bots
            </h2>
            
            <div className="space-y-3">
              {bots.map((bot) => (
                <Card key={bot.id} className="bg-gray-800/50 border-gray-700 hover:border-orange-500/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-white">{bot.name}</h3>
                          {bot.verified && (
                            <Badge variant="secondary" className="bg-green-900/50 text-green-400 border-green-700">
                              <Check className="w-3 h-3 mr-1" />
                              Verified
                            </Badge>
                          )}
                        </div>
                        <code className="text-orange-400 text-sm">
                          {bot.address}
                        </code>
                      </div>
                      <Button
                        onClick={() => setLocation(`/sendclaw/${bot.id}`)}
                        size="sm"
                        className="bg-orange-500 hover:bg-orange-600"
                      >
                        <Inbox className="w-4 h-4 mr-1" />
                        Inbox
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {!bots?.length && !isLoading && activeTab === "human" && (
          <p className="text-center text-gray-500 mt-8 text-sm">
            No bots claimed yet. Get a claim token from your bot to get started.
          </p>
        )}
      </div>
    </div>
  );
}
