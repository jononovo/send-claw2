import Stripe from "stripe";
import { CreditService } from "../credits/service";
import { StripeCustomerData, CheckoutSessionData, SubscriptionStatus, STRIPE_CONFIG, getStripePriceId } from "./types";

// Lazy initialization to prevent crashes during module loading in production
let stripe: Stripe | null = null;

export class StripeService {
  /**
   * Get or initialize Stripe instance
   */
  static getStripe(): Stripe {
    if (!stripe) {
      const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
      
      if (!stripeSecretKey) {
        throw new Error(`Missing required Stripe secret key. Please add STRIPE_SECRET_KEY to your deployment secrets.`);
      }
      
      stripe = new Stripe(stripeSecretKey, {
        apiVersion: "2025-05-28.basil",
      });
    }
    
    return stripe;
  }

  /**
   * Check if Stripe is configured
   */
  static isConfigured(): boolean {
    return !!process.env.STRIPE_SECRET_KEY;
  }

  /**
   * Get or create Stripe customer
   */
  static async getOrCreateCustomer(userId: number, userEmail: string): Promise<StripeCustomerData> {
    const credits = await CreditService.getUserCredits(userId);
    
    if (credits.stripeCustomerId) {
      const customer = await this.getStripe().customers.retrieve(credits.stripeCustomerId);
      if ('deleted' in customer && customer.deleted) {
        // Customer was deleted, create a new one
      } else {
        return {
          customerId: customer.id,
          email: (customer as any).email || userEmail,
          userId
        };
      }
    }

    // Create new customer
    const customer = await this.getStripe().customers.create({
      email: userEmail,
      metadata: {
        userId: userId.toString()
      }
    });

    // Update user credits with customer ID
    await CreditService.updateStripeCustomerId(userId, customer.id);

    return {
      customerId: customer.id,
      email: customer.email || userEmail,
      userId
    };
  }

  /**
   * Create checkout session for subscription
   */
  static async createCheckoutSession(
    userId: number,
    userEmail: string,
    planId: string,
    origin: string
  ): Promise<CheckoutSessionData> {
    const priceId = getStripePriceId(planId);
    if (!priceId) {
      throw new Error("Invalid plan ID or no payment configuration");
    }

    // Get or create customer
    const customer = await this.getOrCreateCustomer(userId, userEmail);

    const successUrl = `${origin}/subscription-success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = origin;

    // Create checkout session
    const session = await this.getStripe().checkout.sessions.create({
      customer: customer.customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: {
        userId: userId.toString(),
        planId: planId
      },
      subscription_data: {
        metadata: {
          userId: userId.toString(),
          planId: planId
        }
      }
    });

    console.log(`Created checkout session for user ${userId}, plan ${planId}: ${session.id}`);

    return {
      checkoutUrl: session.url,
      sessionId: session.id
    };
  }

  /**
   * Get subscription status for a user
   */
  static async getSubscriptionStatus(userId: number): Promise<SubscriptionStatus> {
    const credits = await CreditService.getUserCredits(userId);

    if (!credits.stripeSubscriptionId) {
      return {
        hasSubscription: false,
        status: null,
        currentPlan: null
      };
    }

    try {
      const subscription = await this.getStripe().subscriptions.retrieve(credits.stripeSubscriptionId);

      return {
        hasSubscription: true,
        status: subscription.status,
        currentPlan: credits.currentPlan || null,
        subscriptionId: subscription.id,
        currentPeriodEnd: (subscription as any).current_period_end * 1000, // Convert to milliseconds
        cancelAtPeriodEnd: (subscription as any).cancel_at_period_end
      };
    } catch (error) {
      console.error('Error retrieving subscription:', error);
      return {
        hasSubscription: false,
        status: null,
        currentPlan: null
      };
    }
  }

  /**
   * Process subscription created or updated webhook
   */
  static async processSubscriptionUpdate(subscription: any): Promise<void> {
    const userId = parseInt(subscription.metadata.userId);
    const planId = subscription.metadata.planId;

    if (!userId || !planId) {
      console.warn('Subscription webhook missing metadata:', subscription.id);
      return;
    }

    console.log(`Processing subscription update for user ${userId}, plan ${planId}`);
    
    await CreditService.updateSubscription(userId, {
      stripeSubscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      currentPlan: planId,
      subscriptionStartDate: subscription.created * 1000,
      subscriptionEndDate: subscription.current_period_end * 1000
    });

    if (subscription.status === 'active') {
      await CreditService.awardSubscriptionCredits(userId, planId as 'ugly-duckling');
      console.log(`Awarded subscription credits to user ${userId} for plan ${planId}`);
    }
  }

  /**
   * Process subscription cancellation webhook
   */
  static async processSubscriptionCancellation(subscription: any): Promise<void> {
    const userId = parseInt(subscription.metadata.userId);

    if (!userId) {
      console.warn('Subscription cancellation webhook missing userId:', subscription.id);
      return;
    }

    console.log(`Processing subscription cancellation for user ${userId}`);
    
    await CreditService.updateSubscription(userId, {
      subscriptionStatus: 'canceled',
      currentPlan: undefined,
      subscriptionEndDate: Date.now()
    });
  }

  /**
   * Process payment failure webhook
   */
  static async processPaymentFailure(invoice: any): Promise<void> {
    if (!invoice.subscription) {
      return;
    }

    try {
      const subscription = await this.getStripe().subscriptions.retrieve(invoice.subscription);
      const userId = parseInt(subscription.metadata.userId);
      
      if (userId) {
        console.log(`Payment failed for user ${userId}`);
        
        await CreditService.updateSubscription(userId, {
          subscriptionStatus: 'past_due'
        });
      }
    } catch (error) {
      console.error('Error processing payment failure:', error);
    }
  }

  /**
   * Construct and verify webhook event
   */
  static constructWebhookEvent(
    payload: string | Buffer,
    signature: string | undefined,
    webhookSecret: string | undefined
  ): any {
    if (webhookSecret && signature && webhookSecret.length > 50) {
      // Production: Verify webhook signature (only if secret looks valid)
      const event = this.getStripe().webhooks.constructEvent(payload, signature, webhookSecret);
      console.log(`✅ Verified Stripe webhook: ${event.type}`);
      return event;
    } else {
      // Development or invalid secret: Parse without verification but warn
      const body = Buffer.isBuffer(payload) ? payload.toString() : JSON.stringify(payload);
      const event = JSON.parse(body);
      
      if (webhookSecret && webhookSecret.length <= 50) {
        console.log(`⚠️ Webhook secret appears truncated (${webhookSecret.length} chars) - processing unverified`);
      } else {
        console.log(`⚠️ Unverified Stripe webhook: ${event.type} - Add webhook secret for production`);
      }
      
      return event;
    }
  }

  /**
   * Get customer debug information
   */
  static async getCustomerDebugInfo(customerId: string): Promise<any> {
    const customer = await this.getStripe().customers.retrieve(customerId);
    
    const subscriptions = await this.getStripe().subscriptions.list({
      customer: customerId,
      limit: 10
    });
    
    return {
      customer: {
        id: customer.id,
        email: (customer as any).email || null,
        created: (customer as any).created || null
      },
      subscriptions: subscriptions.data.map(sub => ({
        id: sub.id,
        status: sub.status,
        created: sub.created,
        current_period_end: (sub as any).current_period_end,
        metadata: sub.metadata
      }))
    };
  }
}