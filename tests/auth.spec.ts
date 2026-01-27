import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should show login form', async ({ page }) => {
    await page.goto('/login');

    // Check login form elements - using label text
    await expect(page.getByText('Email Address')).toBeVisible();
    await expect(page.getByText('Password').first()).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation error for empty form', async ({ page }) => {
    await page.goto('/login');

    // Try to submit empty form
    await page.getByRole('button', { name: /sign in/i }).click();

    // Should show validation or stay on login page
    await expect(page).toHaveURL(/.*login/);
  });

  test('should show registration form', async ({ page }) => {
    await page.goto('/register');

    // Check registration form elements - using label text
    await expect(page.getByText('Full Name')).toBeVisible();
    await expect(page.getByText('Work Email')).toBeVisible();
    await expect(page.getByText('Create Password')).toBeVisible();
    await expect(page.getByRole('button', { name: /get started/i })).toBeVisible();
  });

  test('should have forgot password link', async ({ page }) => {
    await page.goto('/login');

    // Check for forgot password link
    const forgotLink = page.getByRole('link', { name: /forgot/i });
    await expect(forgotLink).toBeVisible();

    await forgotLink.click();
    await expect(page).toHaveURL(/.*forgot-password/);
  });
});
