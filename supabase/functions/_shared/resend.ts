// Shared Resend email utilities for Edge Functions

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_EMAIL = Deno.env.get('RESEND_FROM_EMAIL') || 'TaskMaster <noreply@taskmaster.app>';

interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(options: EmailOptions): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: Array.isArray(options.to) ? options.to : [options.to],
        subject: options.subject,
        html: options.html,
        text: options.text,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Resend API error:', error);
      return { success: false, error };
    }

    return { success: true };
  } catch (error) {
    console.error('Email send error:', error);
    return { success: false, error: error.message };
  }
}

// Email templates
export const templates = {
  welcome: (userName: string, language: 'en' | 'lt' = 'en') => {
    const content = language === 'lt' ? {
      subject: 'Sveiki atvyke i TaskMaster!',
      heading: `Sveiki, ${userName}!`,
      body: 'Dziaugiames, kad prisijungete prie TaskMaster. Pradekite kurti projektus ir valdyti uzduotis efektyviai.',
      cta: 'Pradeti',
    } : {
      subject: 'Welcome to TaskMaster!',
      heading: `Welcome, ${userName}!`,
      body: 'We\'re excited to have you on board. Start creating projects and managing your tasks efficiently.',
      cta: 'Get Started',
    };

    return {
      subject: content.subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0;">TaskMaster</h1>
    </div>
    <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px;">${content.heading}</h2>
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${content.body}</p>
    <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/dashboard"
       style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
      ${content.cta}
    </a>
    <p style="color: #52525b; font-size: 14px; margin-top: 32px;">
      &copy; ${new Date().getFullYear()} TaskMaster. All rights reserved.
    </p>
  </div>
</body>
</html>`,
    };
  },

  taskAssigned: (
    assigneeName: string,
    taskTitle: string,
    projectName: string,
    assignedBy: string,
    taskId: string,
    language: 'en' | 'lt' = 'en'
  ) => {
    const content = language === 'lt' ? {
      subject: `Jums priskirta uzduotis: ${taskTitle}`,
      heading: `Sveiki, ${assigneeName}!`,
      body: `${assignedBy} priskyre jums uzduoti "${taskTitle}" projekte "${projectName}".`,
      cta: 'Perziureti uzduoti',
    } : {
      subject: `Task assigned: ${taskTitle}`,
      heading: `Hi ${assigneeName}!`,
      body: `${assignedBy} assigned you to the task "${taskTitle}" in project "${projectName}".`,
      cta: 'View Task',
    };

    return {
      subject: content.subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0;">TaskMaster</h1>
    </div>
    <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px;">${content.heading}</h2>
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${content.body}</p>
    <div style="background: #262626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="color: #ffffff; font-weight: 600; margin: 0 0 8px;">${taskTitle}</p>
      <p style="color: #6366f1; font-size: 14px; margin: 0;">${projectName}</p>
    </div>
    <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/tasks/${taskId}"
       style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
      ${content.cta}
    </a>
  </div>
</body>
</html>`,
    };
  },

  taskReminder: (
    userName: string,
    taskTitle: string,
    projectName: string,
    dueDate: string,
    taskId: string,
    language: 'en' | 'lt' = 'en'
  ) => {
    const content = language === 'lt' ? {
      subject: `Priminimas: ${taskTitle} baigiasi rytoj`,
      heading: `Sveiki, ${userName}!`,
      body: `Jusu uzduotis "${taskTitle}" projekte "${projectName}" baigiasi ${dueDate}.`,
      cta: 'Perziureti uzduoti',
    } : {
      subject: `Reminder: ${taskTitle} is due soon`,
      heading: `Hi ${userName}!`,
      body: `Your task "${taskTitle}" in project "${projectName}" is due on ${dueDate}.`,
      cta: 'View Task',
    };

    return {
      subject: content.subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0;">TaskMaster</h1>
    </div>
    <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px;">${content.heading}</h2>
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${content.body}</p>
    <div style="background: #262626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <p style="color: #ffffff; font-weight: 600; margin: 0 0 8px;">${taskTitle}</p>
      <p style="color: #f59e0b; font-size: 14px; margin: 0;">Due: ${dueDate}</p>
    </div>
    <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/tasks/${taskId}"
       style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
      ${content.cta}
    </a>
  </div>
</body>
</html>`,
    };
  },

  taskOverdue: (
    userName: string,
    taskTitle: string,
    projectName: string,
    dueDate: string,
    taskId: string,
    language: 'en' | 'lt' = 'en'
  ) => {
    const content = language === 'lt' ? {
      subject: `Veluojanti uzduotis: ${taskTitle}`,
      heading: `Sveiki, ${userName}!`,
      body: `Jusu uzduotis "${taskTitle}" projekte "${projectName}" praleido termina (${dueDate}).`,
      cta: 'Perziureti uzduoti',
    } : {
      subject: `Overdue: ${taskTitle}`,
      heading: `Hi ${userName}!`,
      body: `Your task "${taskTitle}" in project "${projectName}" is overdue (was due ${dueDate}).`,
      cta: 'View Task',
    };

    return {
      subject: content.subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0;">TaskMaster</h1>
    </div>
    <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px;">${content.heading}</h2>
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${content.body}</p>
    <div style="background: #262626; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #ef4444;">
      <p style="color: #ffffff; font-weight: 600; margin: 0 0 8px;">${taskTitle}</p>
      <p style="color: #ef4444; font-size: 14px; margin: 0;">Overdue since: ${dueDate}</p>
    </div>
    <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/tasks/${taskId}"
       style="display: inline-block; background: #ef4444; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
      ${content.cta}
    </a>
  </div>
</body>
</html>`,
    };
  },

  // Subscription email templates
  subscriptionPurchased: (
    userName: string,
    planName: string,
    amount: string,
    nextBillingDate: string,
    language: 'en' | 'lt' = 'en'
  ) => {
    const content = language === 'lt' ? {
      subject: `Prenumerata aktyvuota: ${planName}`,
      heading: `Aciu, ${userName}!`,
      body: `Jusu ${planName} prenumerata sekmingai aktyvuota. Dabar turite priega prie visu premium funkciju.`,
      details: `Suma: ${amount} | Kitas mokejimas: ${nextBillingDate}`,
      cta: 'Perziureti prenumerata',
    } : {
      subject: `Subscription activated: ${planName}`,
      heading: `Thank you, ${userName}!`,
      body: `Your ${planName} subscription has been successfully activated. You now have access to all premium features.`,
      details: `Amount: ${amount} | Next billing: ${nextBillingDate}`,
      cta: 'View Subscription',
    };

    return {
      subject: content.subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0;">TaskMaster</h1>
    </div>
    <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px;">${content.heading}</h2>
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${content.body}</p>
    <div style="background: #22c55e20; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #22c55e;">
      <p style="color: #22c55e; font-weight: 600; margin: 0 0 8px;">${planName}</p>
      <p style="color: #a1a1aa; font-size: 14px; margin: 0;">${content.details}</p>
    </div>
    <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/billing"
       style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
      ${content.cta}
    </a>
  </div>
</body>
</html>`,
    };
  },

  subscriptionCanceled: (
    userName: string,
    planName: string,
    endDate: string,
    language: 'en' | 'lt' = 'en'
  ) => {
    const content = language === 'lt' ? {
      subject: `Prenumerata atsaukta`,
      heading: `Sveiki, ${userName}`,
      body: `Jusu ${planName} prenumerata buvo atsaukta. Galite naudotis premium funkcijomis iki ${endDate}.`,
      note: 'Jei tai buvo klaida, galite bet kada atnaujinti prenumerata.',
      cta: 'Atnaujinti prenumerata',
    } : {
      subject: `Subscription canceled`,
      heading: `Hi ${userName}`,
      body: `Your ${planName} subscription has been canceled. You can continue using premium features until ${endDate}.`,
      note: 'If this was a mistake, you can resubscribe at any time.',
      cta: 'Resubscribe',
    };

    return {
      subject: content.subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0;">TaskMaster</h1>
    </div>
    <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px;">${content.heading}</h2>
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${content.body}</p>
    <div style="background: #ef444420; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #ef4444;">
      <p style="color: #ef4444; font-weight: 600; margin: 0 0 8px;">${planName}</p>
      <p style="color: #a1a1aa; font-size: 14px; margin: 0;">Access until: ${endDate}</p>
    </div>
    <p style="color: #71717a; font-size: 14px; margin: 0 0 24px;">${content.note}</p>
    <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/billing"
       style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
      ${content.cta}
    </a>
  </div>
</body>
</html>`,
    };
  },

  subscriptionExpiringSoon: (
    userName: string,
    planName: string,
    daysLeft: number,
    endDate: string,
    language: 'en' | 'lt' = 'en'
  ) => {
    const content = language === 'lt' ? {
      subject: `Prenumerata baigiasi po ${daysLeft} d.`,
      heading: `Sveiki, ${userName}`,
      body: `Jusu ${planName} prenumerata baigiasi ${endDate}. Atnaujinkite, kad neprarastumete prieigos prie premium funkciju.`,
      cta: 'Atnaujinti dabar',
    } : {
      subject: `Subscription expiring in ${daysLeft} days`,
      heading: `Hi ${userName}`,
      body: `Your ${planName} subscription expires on ${endDate}. Renew now to keep access to premium features.`,
      cta: 'Renew Now',
    };

    return {
      subject: content.subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0;">TaskMaster</h1>
    </div>
    <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px;">${content.heading}</h2>
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${content.body}</p>
    <div style="background: #f59e0b20; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
      <p style="color: #f59e0b; font-weight: 600; margin: 0 0 8px;">${planName}</p>
      <p style="color: #a1a1aa; font-size: 14px; margin: 0;">${daysLeft} days remaining</p>
    </div>
    <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/billing"
       style="display: inline-block; background: #f59e0b; color: #000000; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
      ${content.cta}
    </a>
  </div>
</body>
</html>`,
    };
  },

  trialStarted: (
    userName: string,
    planName: string,
    trialDays: number,
    endDate: string,
    language: 'en' | 'lt' = 'en'
  ) => {
    const content = language === 'lt' ? {
      subject: `Jusu ${trialDays} dienu bandomasis laikotarpis prasidejo!`,
      heading: `Sveiki, ${userName}!`,
      body: `Jusu ${planName} bandomasis laikotarpis aktyvuotas. Turite ${trialDays} dienu ismeginti visas premium funkcijas nemokamai.`,
      note: `Bandomasis laikotarpis baigiasi: ${endDate}`,
      cta: 'Pradeti naudotis',
    } : {
      subject: `Your ${trialDays}-day trial has started!`,
      heading: `Welcome, ${userName}!`,
      body: `Your ${planName} trial is now active. You have ${trialDays} days to explore all premium features for free.`,
      note: `Trial ends: ${endDate}`,
      cta: 'Get Started',
    };

    return {
      subject: content.subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0;">TaskMaster</h1>
    </div>
    <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px;">${content.heading}</h2>
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${content.body}</p>
    <div style="background: #3b82f620; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #3b82f6;">
      <p style="color: #3b82f6; font-weight: 600; margin: 0 0 8px;">${planName} Trial</p>
      <p style="color: #a1a1aa; font-size: 14px; margin: 0;">${content.note}</p>
    </div>
    <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/dashboard"
       style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
      ${content.cta}
    </a>
  </div>
</body>
</html>`,
    };
  },

  trialEndingSoon: (
    userName: string,
    planName: string,
    daysLeft: number,
    endDate: string,
    language: 'en' | 'lt' = 'en'
  ) => {
    const content = language === 'lt' ? {
      subject: `Bandomasis laikotarpis baigiasi po ${daysLeft} d.!`,
      heading: `Sveiki, ${userName}`,
      body: `Jusu ${planName} bandomasis laikotarpis baigiasi ${endDate}. Prenumeruokite dabar, kad neprareostumete prieigos prie premium funkciju.`,
      cta: 'Prenumeruoti dabar',
    } : {
      subject: `Trial ending in ${daysLeft} days!`,
      heading: `Hi ${userName}`,
      body: `Your ${planName} trial ends on ${endDate}. Subscribe now to keep access to all premium features.`,
      cta: 'Subscribe Now',
    };

    return {
      subject: content.subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0;">TaskMaster</h1>
    </div>
    <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px;">${content.heading}</h2>
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${content.body}</p>
    <div style="background: #f59e0b20; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
      <p style="color: #f59e0b; font-weight: 600; margin: 0 0 8px;">Trial Ending Soon</p>
      <p style="color: #a1a1aa; font-size: 14px; margin: 0;">${daysLeft} days remaining</p>
    </div>
    <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/billing"
       style="display: inline-block; background: #f59e0b; color: #000000; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
      ${content.cta}
    </a>
  </div>
</body>
</html>`,
    };
  },

  trialEnded: (
    userName: string,
    planName: string,
    language: 'en' | 'lt' = 'en'
  ) => {
    const content = language === 'lt' ? {
      subject: `Bandomasis laikotarpis baigesi`,
      heading: `Sveiki, ${userName}`,
      body: `Jusu ${planName} bandomasis laikotarpis baigesi. Prenumeruokite dabar, kad ir toliau naudotumetes premium funkcijomis.`,
      cta: 'Prenumeruoti dabar',
    } : {
      subject: `Your trial has ended`,
      heading: `Hi ${userName}`,
      body: `Your ${planName} trial has ended. Subscribe now to continue enjoying premium features.`,
      cta: 'Subscribe Now',
    };

    return {
      subject: content.subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0;">TaskMaster</h1>
    </div>
    <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px;">${content.heading}</h2>
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${content.body}</p>
    <div style="background: #ef444420; border-radius: 8px; padding: 16px; margin-bottom: 24px; border-left: 4px solid #ef4444;">
      <p style="color: #ef4444; font-weight: 600; margin: 0;">Trial Ended</p>
    </div>
    <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/billing"
       style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
      ${content.cta}
    </a>
  </div>
</body>
</html>`,
    };
  },

  subscriptionChanged: (
    userName: string,
    oldPlan: string,
    newPlan: string,
    language: 'en' | 'lt' = 'en'
  ) => {
    const content = language === 'lt' ? {
      subject: `Prenumerata pakeista i ${newPlan}`,
      heading: `Sveiki, ${userName}`,
      body: `Jusu prenumerata sekmingai pakeista is ${oldPlan} i ${newPlan}.`,
      cta: 'Perziureti pakeitimus',
    } : {
      subject: `Subscription changed to ${newPlan}`,
      heading: `Hi ${userName}`,
      body: `Your subscription has been successfully changed from ${oldPlan} to ${newPlan}.`,
      cta: 'View Changes',
    };

    return {
      subject: content.subject,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0f0f0f; margin: 0; padding: 40px 20px;">
  <div style="max-width: 560px; margin: 0 auto; background: #1a1a1a; border-radius: 12px; padding: 40px; border: 1px solid #2a2a2a;">
    <div style="text-align: center; margin-bottom: 32px;">
      <h1 style="color: #6366f1; font-size: 28px; margin: 0;">TaskMaster</h1>
    </div>
    <h2 style="color: #ffffff; font-size: 24px; margin: 0 0 16px;">${content.heading}</h2>
    <p style="color: #a1a1aa; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">${content.body}</p>
    <div style="background: #262626; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: #71717a; text-decoration: line-through;">${oldPlan}</span>
        <span style="color: #71717a;">→</span>
        <span style="color: #22c55e; font-weight: 600;">${newPlan}</span>
      </div>
    </div>
    <a href="${Deno.env.get('APP_URL') || 'http://localhost:5173'}/billing"
       style="display: inline-block; background: #6366f1; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: 600;">
      ${content.cta}
    </a>
  </div>
</body>
</html>`,
    };
  },
};
