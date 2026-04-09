import React from 'react';
import { Label } from '@librechat/client';
import { useLocalize } from '~/hooks';

interface MembershipStatusProps {
  tier: string;
  onUpgrade: () => void;
  onRecharge: () => void;
}

const tierColors: Record<string, string> = {
  free: 'text-gray-500',
  basic: 'text-amber-600',
  pro: 'text-gray-400',
  enterprise: 'text-purple-600',
};

const tierNames: Record<string, string> = {
  free: 'Free',
  basic: 'Bronze',
  pro: 'Silver',
  enterprise: 'Gold',
};

const MembershipStatus: React.FC<MembershipStatusProps> = ({ tier, onUpgrade, onRecharge }) => {
  const localize = useLocalize();
  const colorClass = tierColors[tier] || tierColors.free;
  const tierName = tierNames[tier] || 'Free';

  return (
    <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
      <div className="flex items-center gap-2">
        <Label className="text-sm">{localize('com_nav_membership') || 'Membership'}</Label>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${colorClass}`}>
          {tierName}
        </span>
      </div>
      <div className="flex gap-2">
        <button
          onClick={onRecharge}
          className="rounded bg-blue-600 px-3 py-1 text-xs text-white hover:bg-blue-700"
        >
          {localize('com_nav_recharge') || 'Buy Credits'}
        </button>
        {tier === 'free' && (
          <button
            onClick={onUpgrade}
            className="rounded bg-amber-500 px-3 py-1 text-xs text-white hover:bg-amber-600"
          >
            {localize('com_nav_upgrade') || 'Upgrade'}
          </button>
        )}
      </div>
    </div>
  );
};

export default MembershipStatus;
