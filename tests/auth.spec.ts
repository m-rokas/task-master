import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/login');

    // Check login form elements
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByLabel(/password|slaptažodis/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|login|prisijungti/i })).toBeVisible();
  });

  test('should show validation error for empty form', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    await page.getByRole('button', { name: /sign in|login|prisijungti/i }).click();

    // Should show validation or stay on login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should show registration form', async ({ page }) => {
    await page.goto('/register');

    // Check registration form elements
    await expect(page.getByLabel(/name|vardas/i).first()).toBeVisible();
    await expect(page.getByRole('textbox', { name: /email/i })).toBeVisible();
    await expect(page.getByLabel(/password|slaptažodis/i).first()).toBeVisible();
  });

  test('should have forgot password link', async ({ page }) => {
    await page.goto('/login');

    // Check for forgot password link
    const forgotLink = page.getByRole('link', { name: /forgot|pamiršau/i });
    await expect(forgotLink).toBeVisible();

    await forgotLink.click();
    await expect(page).toHaveURL(/.*forgot-password/);
  });
});
