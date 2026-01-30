import { Button } from '@/components/ui/button';
import { Rocket, Clock, TrendingUp } from 'lucide-react';

interface ActivationCTABannerProps {
  onStartClick: () => void;
}

export function ActivationCTABanner({ onStartClick }: ActivationCTABannerProps) {
  return (
    <div className="mb-8 bg-gradient-to-br from-emerald-500 via-teal-500 to-cyan-500 rounded-xl p-10 text-white shadow-2xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-green-300 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium uppercase tracking-wider opacity-90">Ready to Launch</span>
            </div>
            <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text">
              Activate Your Daily Sales Companion 🚀
            </h2>
            <p className="text-lg opacity-90 mb-4">
              Get 5 personalized prospects delivered to your inbox every morning
            </p>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">2 minute setup</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">Build momentum</span>
              </div>
            </div>
          </div>
          
          <div>
            <Button 
              size="lg" 
              className="min-w-[200px] bg-white text-emerald-600 hover:bg-white/90 font-semibold shadow-lg"
              onClick={onStartClick}
            >
              <Rocket className="h-5 w-5 mr-2" />
              Start Daily Outreach
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}