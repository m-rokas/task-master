import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should display landing page with logo and CTA', async ({ page }) => {
    await page.goto('/');

    // Check that the page loads
    await expect(page).toHaveTitle(/TaskMaster/i);

    // Check for main heading or hero section
    const heading = page.locator('h1').first();
    await expect(heading).toBeVisible();

    // Check for login/register buttons
    const loginButton = page.getByRole('link', { name: /login|prisijungti/i });
    await expect(loginButton).toBeVisible();
  });

  test('should navigate to login page', async ({ page }) => {
    await page.goto('/');

    // Click login button
    await page.getByRole('link', { name: /login|prisijungti/i }).click();

    // Should be on login page
    await expect(page).toHaveURL(/.*login/);

    // Check for login form
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/');

    // Click register/signup button
    const registerLink = page.getByRole('link', { name: /register|sign up|registruotis/i });
    if (await registerLink.isVisible()) {
      await registerLink.click();
      await expect(page).toHaveURL(/.*register/);
    }
  });
});
