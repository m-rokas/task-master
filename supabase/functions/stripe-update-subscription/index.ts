// Edge Function: Update Stripe Subscription (change plan without redirect)
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, supabaseAdmin } from '../_shared/supabase.ts';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

interface UpdateSubscriptionRequest {
  userId: string;
  planId: string;
  billingCycle: 'monthly' | 'yearly';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Check if Stripe is configured
    if (!Deno.env.get('STRIPE_SECRET_KEY')) {
      return new Response(
        JSON.stringify({
          error: 'Stripe is not configured',
          message: 'Please configure STRIPE_SECRET_KEY in Supabase Edge Function secrets'
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { userId, planId, billingCycle }: UpdateSubscriptionRequest = await req.json();

    // Get user's profile with stripe_customer_id
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id')
      .eq('id', userId)
      .single();

    if (profileError || !profile?.stripe_customer_id) {
      return new Response(
        JSON.stringify({
          error: 'No payment method',
          message: 'User does not have a Stripe customer ID. Please complete checkout first.',
          requiresCheckout: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the new plan details with Stripe Price IDs
    const { data: newPlan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*, stripe_price_monthly, stripe_price_yearly')
      .eq('id', planId)
      .single();

    if (planError || !newPlan) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the appropriate Stripe Price ID
    const newPriceId = billingCycle === 'yearly' ? newPlan.stripe_price_yearly : newPlan.stripe_price_monthly;

    if (!newPriceId) {
      return new Response(
        JSON.stringify({
          error: 'Stripe not configured for this plan',
          message: `Please set stripe_price_${billingCycle} for the ${newPlan.name} plan in the database`
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the customer's current subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: profile.stripe_customer_id,
      status: 'active',
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      // No active subscription - they need to go through checkout
      return new Response(
        JSON.stringify({
          error: 'No active subscription',
          message: 'No active subscription found. Please complete checkout first.',
          requiresCheckout: true
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const currentSubscription = subscriptions.data[0];
    const subscriptionItemId = currentSubscription.items.data[0].id;

    // Update the subscription to the new price
    const updatedSubscription = await stripe.subscriptions.update(currentSubscription.id, {
      items: [{
        id: subscriptionItemId,
        price: newPriceId,
      }],
      proration_behavior: 'create_prorations', // Charge/credit the difference
      metadata: {
        plan_id: planId,
        billing_cycle: billingCycle,
      },
    });

    // Update local database
    const periodEnd = new Date(updatedSubscription.current_period_end * 1000);

    // Update subscription in database
    await supabaseAdmin
      .from('subscriptions')
      .update({
        plan_id: planId,
        status: 'active',
        current_period_end: periodEnd.toISOString(),
        stripe_subscription_id: updatedSubscription.id,
      })
      .eq('user_id', userId);

    // Update profile's plan_id
    await supabaseAdmin
      .from('profiles')
      .update({ plan_id: planId })
      .eq('id', userId);

    console.log(`Subscription updated for user ${userId} to plan ${newPlan.name}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully upgraded to ${newPlan.display_name}`,
        subscription: {
          id: updatedSubscription.id,
          status: updatedSubscription.status,
          currentPeriodEnd: periodEnd.toISOString(),
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Update subscription error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
