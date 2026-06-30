export type PlanId = "solo" | "agency" | "scale";

export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete";

export interface SubscriptionPlan {
  id: PlanId;
  name: string;
  price: number;
  credits: number;
  accounts: string;
  seats: number;
  stripePriceId: string;
}

export const SUBSCRIPTION_PLANS: SubscriptionPlan[] = [
  {
    id: "solo",
    name: "Solo",
    price: 49,
    credits: 100,
    accounts: "3 ad accounts",
    seats: 1,
    stripePriceId: "price_1TnzGdP2xfBkGbif1tBgMWkw",
  },
  {
    id: "agency",
    name: "Agency",
    price: 149,
    credits: 300,
    accounts: "10 ad accounts",
    seats: 3,
    stripePriceId: "price_1TnzGeP2xfBkGbifuDeBcMNm",
  },
  {
    id: "scale",
    name: "Scale",
    price: 299,
    credits: 500,
    accounts: "Unlimited accounts",
    seats: 10,
    stripePriceId: "price_1TnzGfP2xfBkGbifZJADjLi3",
  },
];

export const TRIAL_DAYS = 7;

export function getPlan(planId: PlanId): SubscriptionPlan | undefined {
  return SUBSCRIPTION_PLANS.find((p) => p.id === planId);
}

export function isAccessAllowed(status: SubscriptionStatus | null | undefined): boolean {
  return status === "trialing" || status === "active";
}
