import { CalendarIcon, Clock } from 'lucide-react';

interface ActiveCampaignBannerProps {
  stats: {
    currentStreak?: number;
    emailsSentToday?: number;
    emailsSentThisMonth?: number;
    companiesContactedThisMonth?: number;
  };
}

export function ActiveCampaignBanner({ stats }: ActiveCampaignBannerProps) {
  const currentDay = Math.min(stats?.currentStreak || 0, 14);
  const daysRemaining = Math.max(14 - currentDay, 0);
  const progressPercentage = Math.min((currentDay / 14) * 100, 100);

  return (
    <div className="mb-8 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl p-10 text-white shadow-2xl relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 bg-white/5 backdrop-blur-3xl"></div>
      <div className="absolute -top-10 -right-10 w-40 h-40 bg-white/10 rounded-full blur-3xl"></div>
      <div className="absolute -bottom-10 -left-10 w-60 h-60 bg-white/10 rounded-full blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium uppercase tracking-wider opacity-90">Campaign Active</span>
            </div>
            <h2 className="text-4xl font-bold mb-3 bg-gradient-to-r from-white to-white/80 bg-clip-text">
              Your Campaign is Live! 🎯
            </h2>
            <p className="text-lg opacity-90 mb-4">Targeting ideal customers with personalized outreach</p>
            
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">Day {currentDay} of 14</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 opacity-80" />
                <span className="text-sm opacity-90">{daysRemaining} days remaining</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4">
            <div className="bg-white/15 backdrop-blur-lg rounded-xl p-6 min-w-[140px] border border-white/20">
              <p className="text-sm opacity-90 mb-1">Emails Sent</p>
              <p className="text-4xl font-bold">{stats?.emailsSentThisMonth || 0}</p>
              <p className="text-xs opacity-70 mt-1">+{stats?.emailsSentToday || 0} today</p>
            </div>
            <div className="bg-white/15 backdrop-blur-lg rounded-xl p-6 min-w-[140px] border border-white/20">
              <p className="text-sm opacity-90 mb-1">Companies Reached</p>
              <p className="text-4xl font-bold">{stats?.companiesContactedThisMonth || 0}</p>
              <p className="text-xs opacity-70 mt-1">This month</p>
            </div>
          </div>
        </div>
        
        {/* Progress bar */}
        <div className="mt-6">
          <div className="bg-white/20 rounded-full h-2 overflow-hidden">
            <div className="bg-white h-full rounded-full transition-all duration-500" 
                 style={{width: `${progressPercentage}%`}}></div>
          </div>
          <p className="text-xs opacity-70 mt-2">Campaign Progress: {Math.round(progressPercentage)}% Complete</p>
        </div>
      </div>
    </div>
  );
}