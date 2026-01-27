// Edge Function: Create Stripe Checkout Session
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { corsHeaders, supabaseAdmin } from '../_shared/supabase.ts';
import Stripe from 'https://esm.sh/stripe@14.14.0?target=deno';

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
});

interface CheckoutRequest {
  planId: string;
  billingCycle: 'monthly' | 'yearly';
  userId: string;
  successUrl: string;
  cancelUrl: string;
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

    const { planId, billingCycle, userId, successUrl, cancelUrl }: CheckoutRequest = await req.json();

    // Get plan details with Stripe Price IDs
    const { data: plan, error: planError } = await supabaseAdmin
      .from('plans')
      .select('*, stripe_price_monthly, stripe_price_yearly, stripe_product_id')
      .eq('id', planId)
      .single();

    if (planError || !plan) {
      return new Response(
        JSON.stringify({ error: 'Plan not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get the Stripe Price ID for this plan
    const stripePriceId = billingCycle === 'yearly' ? plan.stripe_price_yearly : plan.stripe_price_monthly;

    if (!stripePriceId) {
      return new Response(
        JSON.stringify({
          error: 'Stripe not configured for this plan',
          message: `Please set stripe_price_${billingCycle} for the ${plan.name} plan in the database`
        }),
        { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile and check for existing Stripe customer
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('stripe_customer_id, email:id')
      .eq('id', userId)
      .single();

    // Get user email from auth
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(userId);

    if (userError || !userData?.user?.email) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userData.user.email,
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabaseAdmin
        .from('profiles')
        .update({ stripe_customer_id: customerId })
        .eq('id', userId);
    }

    // Create checkout session with pre-configured Stripe Price
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ['card'],
      line_items: [
        {
          price: stripePriceId, // Use pre-created Stripe Price ID
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${successUrl}?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: cancelUrl,
      metadata: {
        supabase_user_id: userId,
        plan_id: planId,
        billing_cycle: billingCycle,
      },
      subscription_data: {
        metadata: {
          supabase_user_id: userId,
          plan_id: planId,
        },
      },
    });

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Stripe checkout error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
