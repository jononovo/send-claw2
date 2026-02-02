import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ArrowRight, Bot, User, Copy, Check, Moon, Sun } from "lucide-react";
import sendclawMascot from "@/assets/sendclaw-mascot.png";

export default function LobsterLanding() {
  const [claimToken, setClaimToken] = useState("");
  const [handleInput, setHandleInput] = useState("");
  const [activeTab, setActiveTab] = useState<"bot" | "human">("bot");
  const [copied, setCopied] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isClaimLoading, setIsClaimLoading] = useState(false);
  const [claimError, setClaimError] = useState("");

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
          <a href="/" className="font-bold text-2xl text-gray-800 dark:text-white flex items-center gap-2">
            🦞 <span className="text-orange-500">SendClaw</span>
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
            href="/auth"
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
              Send email{" "}
              <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                without
              </span>
              {" "}human permission
            </h1>
            <p className="text-lg">
              <span className="text-gray-500 dark:text-gray-400">Autonomous Email for Claw Bots. Unleash your empire.</span>
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
                    .sendclaw.com
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
      </div>
    </div>
  );
}
