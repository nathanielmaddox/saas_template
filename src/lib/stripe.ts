import { Stripe, loadStripe } from '@stripe/stripe-js';

// Client-side Stripe instance
let stripePromise: Promise<Stripe | null>;

export const getStripe = () => {
  if (!stripePromise) {
    stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!);
  }
  return stripePromise;
};

// Subscription plans configuration
export const SUBSCRIPTION_PLANS = {
  free: {
    id: 'free',
    name: 'Free',
    description: 'Perfect for getting started',
    price: 0,
    interval: 'month',
    features: [
      'Up to 3 projects',
      'Basic analytics',
      'Email support',
      '1GB storage',
    ],
    limitations: {
      projects: 3,
      storage: 1024, // MB
      apiCalls: 1000,
    },
  },
  pro: {
    id: 'pro',
    name: 'Pro',
    description: 'For growing businesses',
    price: 19,
    interval: 'month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRO_PRICE_ID,
    features: [
      'Unlimited projects',
      'Advanced analytics',
      'Priority support',
      '10GB storage',
      'Custom integrations',
    ],
    limitations: {
      projects: -1, // unlimited
      storage: 10240, // MB
      apiCalls: 10000,
    },
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations',
    price: 99,
    interval: 'month',
    priceId: process.env.NEXT_PUBLIC_STRIPE_ENTERPRISE_PRICE_ID,
    features: [
      'Everything in Pro',
      'Dedicated support',
      'Custom development',
      'Unlimited storage',
      'SLA guarantee',
      'SSO integration',
    ],
    limitations: {
      projects: -1, // unlimited
      storage: -1, // unlimited
      apiCalls: -1, // unlimited
    },
  },
} as const;

export type SubscriptionPlan = keyof typeof SUBSCRIPTION_PLANS;

// Utility functions
export const formatPrice = (price: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);
};

export const getPlanFeatures = (planId: SubscriptionPlan) => {
  return SUBSCRIPTION_PLANS[planId]?.features || [];
};

export const getPlanLimitations = (planId: SubscriptionPlan) => {
  return SUBSCRIPTION_PLANS[planId]?.limitations || {};
};

export const isFeatureAvailable = (
  userPlan: SubscriptionPlan,
  requiredPlan: SubscriptionPlan
): boolean => {
  const planHierarchy: SubscriptionPlan[] = ['free', 'pro', 'enterprise'];
  const userPlanIndex = planHierarchy.indexOf(userPlan);
  const requiredPlanIndex = planHierarchy.indexOf(requiredPlan);

  return userPlanIndex >= requiredPlanIndex;
};

export const canExceedLimit = (
  userPlan: SubscriptionPlan,
  limitType: keyof typeof SUBSCRIPTION_PLANS.free.limitations,
  currentUsage: number
): boolean => {
  const plan = SUBSCRIPTION_PLANS[userPlan];
  if (!plan) return false;

  const limit = plan.limitations[limitType];
  if (limit === -1) return true; // unlimited

  return currentUsage < limit;
};

// Webhook event types
export const STRIPE_WEBHOOK_EVENTS = {
  CHECKOUT_SESSION_COMPLETED: 'checkout.session.completed',
  INVOICE_PAYMENT_SUCCEEDED: 'invoice.payment_succeeded',
  INVOICE_PAYMENT_FAILED: 'invoice.payment_failed',
  CUSTOMER_SUBSCRIPTION_CREATED: 'customer.subscription.created',
  CUSTOMER_SUBSCRIPTION_UPDATED: 'customer.subscription.updated',
  CUSTOMER_SUBSCRIPTION_DELETED: 'customer.subscription.deleted',
} as const;

export type StripeWebhookEvent = typeof STRIPE_WEBHOOK_EVENTS[keyof typeof STRIPE_WEBHOOK_EVENTS];