import { User, Package, Target } from 'lucide-react';

interface SetupProgressBannerProps {
  hasSenderProfile: boolean;
  hasProduct: boolean;
  hasCustomerProfile: boolean;
}

export function SetupProgressBanner({ 
  hasSenderProfile, 
  hasProduct, 
  hasCustomerProfile 
}: SetupProgressBannerProps) {
  const componentsFilledCount = [hasSenderProfile, hasProduct, hasCustomerProfile].filter(Boolean).length;

  return (
    <div className="mb-8 bg-gradient-to-br from-amber-400 via-orange-400 to-yellow-400 rounded-xl p-10 text-white shadow-2xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-yellow-300 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium uppercase tracking-wider opacity-90">Campaign Setup</span>
            </div>
            <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text">
              Build Your Outreach Campaign 🎯
            </h2>
            <p className="text-lg opacity-90 mb-4">Configure the 3 components below to start generating daily leads</p>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">{hasSenderProfile ? '✓ Profile Set' : 'Add Your Profile'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">{hasProduct ? '✓ Product Added' : 'Define Product'}</span>
              </div>
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">{hasCustomerProfile ? '✓ Customer Defined' : 'Set Target'}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/15 backdrop-blur-lg rounded-xl p-6 min-w-[140px] border border-white/20">
              <p className="text-sm opacity-90 mb-1">Setup Progress</p>
              <p className="text-4xl font-bold">{componentsFilledCount}/3</p>
              <p className="text-xs opacity-70 mt-1">
                {componentsFilledCount === 0 && "Let's start"}
                {componentsFilledCount === 1 && "Good progress"}
                {componentsFilledCount === 2 && "Almost ready"}
                {componentsFilledCount === 3 && "Ready to launch"}
              </p>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-6">
          <div className="bg-white/20 rounded-full h-2 overflow-hidden">
            <div className="bg-white h-full rounded-full transition-all duration-500" 
                 style={{width: `${(componentsFilledCount / 3) * 100}%`}}></div>
          </div>
          <p className="text-xs opacity-70 mt-2">Setup Progress: {Math.round((componentsFilledCount / 3) * 100)}% Complete</p>
        </div>
      </div>
    </div>
  );
}