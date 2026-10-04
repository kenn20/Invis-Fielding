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
