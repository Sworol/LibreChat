import React from 'react';
import { render, screen, fireEvent } from 'test/layout-test-utils';
import MembershipStatus from '../MembershipStatus';

// Mock @librechat/client to avoid module resolution issues
jest.mock('@librechat/client', () => ({
  Label: ({ children, className }: any) => (
    <label className={className}>{children}</label>
  ),
}));

// Mock useLocalize hook
const mockLocalize = jest.fn((key) => {
  const translations: Record<string, string> = {
    com_nav_membership: 'Membership',
    com_nav_recharge: 'Buy Credits',
    com_nav_upgrade: 'Upgrade',
  };
  return translations[key] || key;
});

jest.mock('~/hooks', () => ({
  useLocalize: () => mockLocalize,
}));

describe('MembershipStatus', () => {
  const mockOnUpgrade = jest.fn();
  const mockOnRecharge = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render membership label', () => {
      render(<MembershipStatus tier="free" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      expect(screen.getByText('Membership')).toBeInTheDocument();
    });

    it('should render recharge button', () => {
      render(<MembershipStatus tier="free" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      expect(screen.getByText('Buy Credits')).toBeInTheDocument();
    });

    it('should show upgrade button only for free tier', () => {
      render(<MembershipStatus tier="free" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      expect(screen.getByText('Upgrade')).toBeInTheDocument();
    });

    it('should NOT show upgrade button for basic tier', () => {
      render(<MembershipStatus tier="basic" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      expect(screen.queryByText('Upgrade')).not.toBeInTheDocument();
    });

    it('should NOT show upgrade button for pro tier', () => {
      render(<MembershipStatus tier="pro" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      expect(screen.queryByText('Upgrade')).not.toBeInTheDocument();
    });

    it('should NOT show upgrade button for enterprise tier', () => {
      render(<MembershipStatus tier="enterprise" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      expect(screen.queryByText('Upgrade')).not.toBeInTheDocument();
    });
  });

  describe('tier display', () => {
    it('should display "Free" for free tier', () => {
      render(<MembershipStatus tier="free" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      expect(screen.getByText('Free')).toBeInTheDocument();
    });

    it('should display "Bronze" for basic tier', () => {
      render(<MembershipStatus tier="basic" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      expect(screen.getByText('Bronze')).toBeInTheDocument();
    });

    it('should display "Silver" for pro tier', () => {
      render(<MembershipStatus tier="pro" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      expect(screen.getByText('Silver')).toBeInTheDocument();
    });

    it('should display "Gold" for enterprise tier', () => {
      render(<MembershipStatus tier="enterprise" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      expect(screen.getByText('Gold')).toBeInTheDocument();
    });

    it('should default to "Free" for unknown tier', () => {
      render(<MembershipStatus tier="unknown" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      expect(screen.getByText('Free')).toBeInTheDocument();
    });
  });

  describe('button interactions', () => {
    it('should call onRecharge when recharge button is clicked', () => {
      render(<MembershipStatus tier="free" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      fireEvent.click(screen.getByText('Buy Credits'));
      expect(mockOnRecharge).toHaveBeenCalledTimes(1);
    });

    it('should call onUpgrade when upgrade button is clicked (free tier)', () => {
      render(<MembershipStatus tier="free" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      fireEvent.click(screen.getByText('Upgrade'));
      expect(mockOnUpgrade).toHaveBeenCalledTimes(1);
    });

    it('should call onRecharge for paid tiers', () => {
      render(<MembershipStatus tier="pro" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      fireEvent.click(screen.getByText('Buy Credits'));
      expect(mockOnRecharge).toHaveBeenCalledTimes(1);
    });
  });

  describe('visual structure', () => {
    it('should have two buttons visible for free tier', () => {
      render(<MembershipStatus tier="free" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(2);
    });

    it('should have one button visible for non-free tiers', () => {
      render(<MembershipStatus tier="pro" onUpgrade={mockOnUpgrade} onRecharge={mockOnRecharge} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons).toHaveLength(1);
    });
  });
});
