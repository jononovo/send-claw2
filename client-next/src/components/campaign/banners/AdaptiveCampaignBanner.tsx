import { ActiveCampaignBanner } from './ActiveCampaignBanner';
import { SetupProgressBanner } from './SetupProgressBanner';
import { ActivationCTABanner } from './ActivationCTABanner';

interface AdaptiveCampaignBannerProps {
  isActivated: boolean;
  stats?: {
    currentStreak?: number;
    emailsSentToday?: number;
    emailsSentThisMonth?: number;
    companiesContactedThisMonth?: number;
  };
  hasSenderProfile: boolean;
  hasProduct: boolean;
  hasCustomerProfile: boolean;
  onStartClick?: () => void;
}

export function AdaptiveCampaignBanner({
  isActivated,
  stats,
  hasSenderProfile,
  hasProduct,
  hasCustomerProfile,
  onStartClick
}: AdaptiveCampaignBannerProps) {
  const hasNoComponents = !hasSenderProfile && !hasProduct && !hasCustomerProfile;
  const hasAllComponents = hasSenderProfile && hasProduct && hasCustomerProfile;

  if (hasNoComponents) {
    return <ActivationCTABanner onStartClick={onStartClick || (() => {})} />;
  }

  if (isActivated && hasAllComponents) {
    return <ActiveCampaignBanner stats={stats || {}} />;
  }

  return (
    <SetupProgressBanner
      hasSenderProfile={hasSenderProfile}
      hasProduct={hasProduct}
      hasCustomerProfile={hasCustomerProfile}
    />
  );
}
