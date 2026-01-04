import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
  }).format(amount / 100);
}

export function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(date));
}

export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function getSubscriptionBenefits(tier: string) {
  const benefits = {
    FREE: {
      credits: 5,
      features: ['Basic listings', 'Limited swaps', 'Community access'],
    },
    MONTHLY: {
      credits: 20,
      features: [
        'Priority listings',
        'Unlimited swaps',
        'Advanced search',
        'Plant care tips',
        'Early access to rare plants',
      ],
    },
    YEARLY: {
      credits: 250,
      features: [
        'Premium listings',
        'Unlimited swaps',
        'Advanced search',
        'Plant care tips',
        'Early access to rare plants',
        'Exclusive community events',
        'Personal plant consultant',
      ],
    },
  };

  return benefits[tier as keyof typeof benefits] || benefits.FREE;
}
