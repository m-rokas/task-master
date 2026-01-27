// Edge Function: Handle Stripe Webhooks
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { supabaseAdmin } from '../_shared/supabase.ts';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || '';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');

  if (!signature) {
    return new Response('No signature', { status: 400 });
  }

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

    console.log('Stripe webhook event:', event.type);

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutComplete(session);
        break;
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        break;
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionCanceled(subscription);
        break;
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentSucceeded(invoice);
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        await handlePaymentFailed(invoice);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return new Response(JSON.stringify({ received: true }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
});

async function handleCheckoutComplete(session: Stripe.Checkout.Session) {
  const userId = session.metadata?.supabase_user_id;
  const planId = session.metadata?.plan_id;
  const billingCycle = session.metadata?.billing_cycle;

  if (!userId || !planId) {
    console.error('Missing metadata in checkout session');
    return;
  }

  console.log(`Checkout completed for user ${userId}, plan ${planId}`);

  // Subscription will be created by Stripe and handled in subscription.created event
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  // Get user ID from customer
  const customer = await stripe.customers.retrieve(subscription.customer as string);
  const userId = (customer as Stripe.Customer).metadata?.supabase_user_id;

  if (!userId) {
    // Try to find user by stripe_customer_id
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('stripe_customer_id', subscription.customer)
      .single();

    if (!profile) {
      console.error('Could not find user for subscription');
      return;
    }

    await updateSubscription(profile.id, subscription);
  } else {
    await updateSubscription(userId, subscription);
  }
}

async function updateSubscription(userId: string, subscription: Stripe.Subscription) {
  // Map Stripe status to our status
  const statusMap: Record<string, string> = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    unpaid: 'past_due',
    incomplete: 'pending',
    incomplete_expired: 'canceled',
  };

  const status = statusMap[subscription.status] || 'active';

  // Get the price to find the plan
  const priceId = subscription.items.data[0]?.price.id;
  const amount = subscription.items.data[0]?.price.unit_amount || 0;

  // Find matching plan by price (approximate matching)
  const { data: plans } = await supabaseAdmin
    .from('plans')
    .select('id, price_monthly, price_yearly')
    .eq('is_active', true);

  let planId = null;
  if (plans) {
    const amountInEur = amount / 100;
    for (const plan of plans) {
      if (plan.price_monthly === amountInEur || plan.price_yearly === amountInEur) {
        planId = plan.id;
        break;
      }
    }
  }

  // Upsert subscription
  const { error } = await supabaseAdmin
    .from('subscriptions')
    .upsert({
      user_id: userId,
      plan_id: planId,
      status,
      stripe_subscription_id: subscription.id,
      current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
      current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
      cancel_at_period_end: subscription.cancel_at_period_end,
      canceled_at: subscription.canceled_at
        ? new Date(subscription.canceled_at * 1000).toISOString()
        : null,
    }, { onConflict: 'user_id' });

  if (error) {
    console.error('Error upserting subscription:', error);
    return;
  }

  // Update profile plan_id
  if (planId) {
    await supabaseAdmin
      .from('profiles')
      .update({ plan_id: planId })
      .eq('id', userId);
  }

  console.log(`Updated subscription for user ${userId}: ${status}`);
}

async function handleSubscriptionCanceled(subscription: Stripe.Subscription) {
  // Get user by stripe_customer_id
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', subscription.customer)
    .single();

  if (!profile) {
    console.error('Could not find user for canceled subscription');
    return;
  }

  // Get free plan
  const { data: freePlan } = await supabaseAdmin
    .from('plans')
    .select('id')
    .eq('name', 'free')
    .single();

  // Update subscription to canceled
  await supabaseAdmin
    .from('subscriptions')
    .update({
      status: 'canceled',
      canceled_at: new Date().toISOString(),
      plan_id: freePlan?.id,
    })
    .eq('user_id', profile.id);

  // Update profile to free plan
  if (freePlan) {
    await supabaseAdmin
      .from('profiles')
      .update({ plan_id: freePlan.id })
      .eq('id', profile.id);
  }

  console.log(`Subscription canceled for user ${profile.id}`);
}

async function handlePaymentSucceeded(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  // Get user by stripe_customer_id
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (!profile) return;

  // Record payment
  await supabaseAdmin.from('payments').insert({
    user_id: profile.id,
    amount: (invoice.amount_paid || 0) / 100,
    currency: invoice.currency?.toUpperCase() || 'EUR',
    status: 'succeeded',
    stripe_invoice_id: invoice.id,
  });

  console.log(`Payment succeeded for user ${profile.id}: ${invoice.amount_paid / 100} ${invoice.currency}`);
}

async function handlePaymentFailed(invoice: Stripe.Invoice) {
  if (!invoice.subscription) return;

  // Get user by stripe_customer_id
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('id')
    .eq('stripe_customer_id', invoice.customer)
    .single();

  if (!profile) return;

  // Record failed payment
  await supabaseAdmin.from('payments').insert({
    user_id: profile.id,
    amount: (invoice.amount_due || 0) / 100,
    currency: invoice.currency?.toUpperCase() || 'EUR',
    status: 'failed',
    stripe_invoice_id: invoice.id,
  });

  // Update subscription status
  await supabaseAdmin
    .from('subscriptions')
    .update({ status: 'past_due' })
    .eq('user_id', profile.id);

  console.log(`Payment failed for user ${profile.id}`);
}
