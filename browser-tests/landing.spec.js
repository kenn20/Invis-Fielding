import { expect, test } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

for (const width of [375, 1440]) {
  test(`responsive page and accessible signup at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Your Shield,');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    const issues = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    expect(issues.violations).toEqual([]);
    await page.getByRole('navigation').getByRole('link', { name: 'Get early access updates' }).click();
    await expect(page.getByLabel('Email address')).toBeFocused();
    expect((await page.locator('#early-access').boundingBox()).y).toBeGreaterThanOrEqual(80);
    await page.route('https://signup.test/signup', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"ok":false}' }));
    await page.getByLabel('Email address').fill('person@example.com');
    await page.getByRole('button', { name: 'Get early access updates' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByLabel('Email address')).toHaveValue('person@example.com');
    await page.unroute('https://signup.test/signup');
    await page.route('https://signup.test/signup', route => route.fulfill({ contentType: 'application/json', body: '{"ok":true}' }));
    await page.getByRole('button', { name: 'Get early access updates' }).click();
    await expect(page.getByText('You’re on the interest list.')).toBeVisible();
    await expect(page.getByRole('status')).toBeFocused();
  });
}

test('screenshots and keyboard entry', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.screenshot({ path: 'artifacts/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({ path: 'artifacts/mobile.png', fullPage: true });
});

 test('concept workflow progresses and restarts without sending alerts', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('link', { name: 'Try the protection workflow' }).click();
  await expect(page.getByText('Step 1 of 4 · Ready for your journey')).toBeVisible();
  await page.getByRole('button', { name: 'Simulate an incident' }).click();
  await expect(page.getByText('Step 2 of 4 · Incident captured · Simulation')).toBeVisible();
  await page.getByRole('button', { name: 'Preview contact alert' }).click();
  await expect(page.getByText('Step 3 of 4 · Alert preview · Not sent')).toBeVisible();
  await page.getByRole('button', { name: 'Review the sample record' }).click();
  await expect(page.getByText('Step 4 of 4 · Sample record ready for review')).toBeVisible();
  await page.getByRole('button', { name: 'Restart demo' }).click();
  await expect(page.getByText('Step 1 of 4 · Ready for your journey')).toBeVisible();
 });
