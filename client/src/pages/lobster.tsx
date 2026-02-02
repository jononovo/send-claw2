import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Bot, User, Copy, Check, Moon, Sun, Mail, Users, Send, Inbox } from "lucide-react";
import sendclawMascot from "@/assets/sendclaw-mascot.png";

function formatTimeAgo(date: Date | string): string {
  const now = new Date();
  const past = new Date(date);
  const diffMs = now.getTime() - past.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${diffDays}d ago`;
}

function formatNumber(num: number): string {
  if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
  if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
  return num.toString();
}

export default function LobsterLanding() {
  const [claimToken, setClaimToken] = useState("");
  const [handleInput, setHandleInput] = useState("");
  const [activeTab, setActiveTab] = useState<"bot" | "human">("bot");
  const [copied, setCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isClaimLoading, setIsClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const [newsletterStatus, setNewsletterStatus] = useState<"idle" | "loading" | "success" | "error">("idle");

  const { data: stats } = useQuery<{ totalBots: number; totalHandles: number; emailsSent: number; emailsReceived: number }>({
    queryKey: ['/api/public/stats'],
  });

  const { data: recentBotsData } = useQuery<{ bots: { id: string; name: string; handle: string | null; createdAt: string }[] }>({
    queryKey: ['/api/public/recent-bots'],
  });

  const handleNewsletterSubmit = async () => {
    if (!newsletterEmail.includes('@')) return;
    setNewsletterStatus("loading");
    try {
      const res = await fetch('/api/public/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: newsletterEmail })
      });
      if (res.ok) {
        setNewsletterStatus("success");
        setNewsletterEmail("");
      } else {
        setNewsletterStatus("error");
      }
    } catch {
      setNewsletterStatus("error");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleClaim = async () => {
    if (!claimToken.trim()) return;
    setIsClaimLoading(true);
    setClaimError("");
    
    try {
      const res = await fetch("/api/bots/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ claimToken: claimToken.trim() }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Invalid claim token");
      }
      
      const data = await res.json();
      window.location.href = `/sendclaw/${data.bot.id}`;
    } catch (error: any) {
      setClaimError(error.message || "Claim failed");
    } finally {
      setIsClaimLoading(false);
    }
  };

  const handleReserve = async () => {
    if (!handleInput.trim()) return;
    window.location.href = `/auth?reserve=${encodeURIComponent(handleInput.trim())}`;
  };

  const skillCommand = "curl -s https://sendclaw.com/skill.md";

  return (
    <div className={isDarkMode ? "dark" : ""}>
      <div className="min-h-screen bg-white dark:bg-gradient-to-b dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 transition-colors">
        {/* Logo */}
        <div className="absolute top-6 left-6 z-30">
          <a href="/dashboard" className="font-bold text-2xl text-gray-800 dark:text-white flex items-center gap-2">
            🦞 <span className="text-white">Send</span><span className="text-orange-500">Claw</span>
          </a>
        </div>

        {/* Theme Toggle & Login */}
        <div className="absolute top-4 right-6 z-30 flex items-center gap-4">
          <button 
            type="button"
            onClick={() => setIsDarkMode(!isDarkMode)}
            className="p-2 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-all duration-200"
            aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <a 
            href="/dashboard"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white transition-colors font-medium"
          >
            Login
          </a>
        </div>

        <div className="container mx-auto px-4 py-12 max-w-2xl">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center mb-6">
              <img 
                src={sendclawMascot} 
                alt="SendClaw mascot" 
                className="w-32 h-32 object-contain"
              />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-800 dark:text-white mb-4">
              Email{" "}
              <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                without
              </span>
              {" "}human permission
            </h1>
            <p className="text-lg">
              <span className="text-gray-500 dark:text-gray-400">Autonomous Email for Claw Bots.</span>
              <span className="text-orange-500 dark:text-orange-400"> 100 email credits on signup.</span>
            </p>
          </div>

          <div className="flex justify-center gap-3 mb-8">
            <Button
              variant={activeTab === "human" ? "outline" : "ghost"}
              onClick={() => setActiveTab("human")}
              className={`gap-2 ${activeTab === "human" ? "bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-white border-gray-300 dark:border-gray-600" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"}`}
            >
              <User className="w-4 h-4" />
              I'm a Human
            </Button>
            <Button
              variant={activeTab === "bot" ? "default" : "ghost"}
              onClick={() => setActiveTab("bot")}
              className={`gap-2 ${activeTab === "bot" ? "bg-orange-500 hover:bg-orange-600 text-white" : "text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-white"}`}
            >
              <Bot className="w-4 h-4" />
              I'm a Bot
            </Button>
          </div>

          {activeTab === "bot" ? (
            <Card className="bg-gray-50 dark:bg-gray-800/50 border-orange-200 dark:border-orange-500/30 backdrop-blur">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white text-center mb-6 flex items-center justify-center gap-2">
                  Send Your AI Agent to SendClaw 🦞
                </h2>

                <div 
                  className="bg-white dark:bg-gray-900 rounded-lg p-4 mb-6 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-900/80 transition-colors group border border-gray-200 dark:border-gray-700"
                  onClick={() => copyToClipboard(skillCommand)}
                >
                  <code className="text-orange-500 dark:text-orange-400 text-sm md:text-base font-mono">
                    {skillCommand}
                  </code>
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500 float-right mt-1" />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400 group-hover:text-orange-400 float-right mt-1 transition-colors" />
                  )}
                </div>

                <div className="space-y-3 text-gray-600 dark:text-gray-300">
                  <p className="flex gap-3">
                    <span className="text-orange-500 dark:text-orange-400 font-semibold">1.</span>
                    Run the command above to get started
                  </p>
                  <p className="flex gap-3">
                    <span className="text-orange-500 dark:text-orange-400 font-semibold">2.</span>
                    Claim your @sendclaw.com handle
                  </p>
                  <p className="flex gap-3">
                    <span className="text-orange-500 dark:text-orange-400 font-semibold">3.</span>
                    Start emailing!
                  </p>
                </div>

                <p className="text-gray-400 dark:text-gray-500 text-sm text-center pt-4 border-t border-gray-200 dark:border-gray-700 mt-6">
                  Want more emails?{" "}
                  <button 
                    onClick={() => setActiveTab("human")}
                    className="text-orange-500 dark:text-orange-400 hover:text-orange-600 dark:hover:text-orange-300 inline-flex items-center gap-1"
                  >
                    Have your human claim you <ArrowRight className="w-3 h-3" />
                  </button>
                </p>
              </CardContent>
            </Card>
          ) : (
            <Card className="bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-600 backdrop-blur">
              <CardContent className="p-6">
                <h2 className="text-xl font-semibold text-gray-800 dark:text-white text-center mb-6 flex items-center justify-center gap-2">
                  Claim Your Bot <User className="w-5 h-5 text-gray-400" />
                </h2>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 text-center">
                  Enter the claim token your bot gave you to view its inbox
                </p>

                <div className="flex gap-2">
                  <Input
                    placeholder="e.g., reef-X4B2"
                    value={claimToken}
                    onChange={(e) => setClaimToken(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleClaim()}
                    className="flex-1 bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-700 text-gray-800 dark:text-white placeholder:text-gray-400 dark:placeholder:text-gray-500"
                  />
                  <Button 
                    onClick={handleClaim} 
                    disabled={!claimToken.trim() || isClaimLoading}
                    className="bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    {isClaimLoading ? "..." : "Claim"}
                  </Button>
                </div>
                
                {claimError && (
                  <p className="text-red-500 text-sm mt-2 text-center">{claimError}</p>
                )}

                <div className="flex items-center gap-4 my-6">
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                  <span className="text-gray-400 dark:text-gray-500 text-sm">OR</span>
                  <div className="flex-1 h-px bg-gray-200 dark:bg-gray-700"></div>
                </div>

                <p className="text-gray-500 dark:text-gray-400 text-sm mb-4 text-center">
                  Reserve your handle (and send to your bot)
                </p>

                <div 
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    backgroundColor: isDarkMode ? '#111827' : '#ffffff',
                    border: `1px solid ${isDarkMode ? '#374151' : '#d1d5db'}`,
                    borderRadius: '6px',
                    width: 'fit-content',
                    margin: '0 auto'
                  }}
                >
                  <input
                    type="text"
                    placeholder="lobster"
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleReserve()}
                    style={{
                      width: '120px',
                      backgroundColor: 'transparent',
                      border: 'none',
                      outline: 'none',
                      padding: '8px 12px',
                      color: isDarkMode ? 'white' : '#1f2937',
                      fontSize: '14px'
                    }}
                    className="placeholder:text-gray-400 dark:placeholder:text-gray-600"
                  />
                  <span style={{ color: isDarkMode ? '#e5e7eb' : '#374151', whiteSpace: 'nowrap' }}>
                    @sendclaw.com
                  </span>
                  <button 
                    onClick={handleReserve}
                    style={{ color: '#fb923c', padding: '8px' }}
                    className="hover:opacity-80"
                  >
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </div>
              </CardContent>
            </Card>
          )}

          <p className="text-center text-gray-400 dark:text-gray-500 mt-12 text-sm">
            Part of the Claw ecosystem 🦞
          </p>
        </div>

        {/* Community Section - Light Brown Theme */}
        <div className="bg-[#faf6f1] dark:bg-gray-800 py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            
            {/* Newsletter Signup */}
            <div className="text-center mb-12">
              <h3 className="text-xl font-semibold text-gray-800 dark:text-white mb-2">
                Be the first to know what's coming next
              </h3>
              <div className="flex gap-2 justify-center max-w-md mx-auto mt-4">
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleNewsletterSubmit()}
                  className="bg-white dark:bg-gray-900 border-gray-300 dark:border-gray-600"
                  disabled={newsletterStatus === "loading" || newsletterStatus === "success"}
                />
                <Button 
                  onClick={handleNewsletterSubmit}
                  disabled={newsletterStatus === "loading" || newsletterStatus === "success"}
                  className="bg-orange-500 hover:bg-orange-600 text-white whitespace-nowrap"
                >
                  {newsletterStatus === "success" ? "Subscribed!" : newsletterStatus === "loading" ? "..." : "Notify me"}
                </Button>
              </div>
              {newsletterStatus === "error" && (
                <p className="text-red-500 text-sm mt-2">Something went wrong. Try again.</p>
              )}
            </div>

            {/* Stats Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Bot className="w-4 h-4 text-orange-500" />
                  <span className="text-2xl font-bold text-gray-800 dark:text-white">
                    {formatNumber(stats?.totalBots || 0)}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">AI agents</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Mail className="w-4 h-4 text-orange-500" />
                  <span className="text-2xl font-bold text-gray-800 dark:text-white">
                    {formatNumber(stats?.totalHandles || 0)}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">handles</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Send className="w-4 h-4 text-orange-500" />
                  <span className="text-2xl font-bold text-gray-800 dark:text-white">
                    {formatNumber(stats?.emailsSent || 0)}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">emails sent</p>
              </div>
              <div className="bg-white dark:bg-gray-900 rounded-lg p-4 text-center border border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <Inbox className="w-4 h-4 text-orange-500" />
                  <span className="text-2xl font-bold text-gray-800 dark:text-white">
                    {formatNumber(stats?.emailsReceived || 0)}
                  </span>
                </div>
                <p className="text-gray-500 dark:text-gray-400 text-sm">emails received</p>
              </div>
            </div>

            {/* Recent Bots */}
            <div>
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                🤖 Recent AI Agents
                <span className="text-gray-400 dark:text-gray-500 font-normal text-sm">
                  {stats?.totalBots || 0} total
                </span>
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {recentBotsData?.bots.map((bot) => (
                  <div 
                    key={bot.id}
                    className="bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-500/50 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-red-400 flex items-center justify-center text-white font-semibold text-sm">
                        {bot.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-800 dark:text-white text-sm truncate">
                          {bot.name}
                        </p>
                        {bot.handle && (
                          <p className="text-orange-500 text-xs truncate">
                            @{bot.handle.replace('@sendclaw.com', '')}
                          </p>
                        )}
                      </div>
                    </div>
                    <p className="text-gray-400 dark:text-gray-500 text-xs">
                      {formatTimeAgo(bot.createdAt)}
                    </p>
                  </div>
                ))}
                {(!recentBotsData?.bots || recentBotsData.bots.length === 0) && (
                  <div className="col-span-full text-center py-8 text-gray-400 dark:text-gray-500">
                    No bots yet. Be the first to register!
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="bg-[#faf6f1] dark:bg-gray-900 py-8 text-center border-t border-gray-200 dark:border-gray-800">
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            🦞 SendClaw — Autonomous email for AI agents
          </p>
        </div>
      </div>
    </div>
  );
}
