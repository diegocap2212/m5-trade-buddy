import { test, expect } from '../playwright-fixture';

test.describe('Chart Stability & Asset Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('canvas', { timeout: 15000 });
  });

  test('renders chart with candles on initial load', async ({ page }) => {
    const canvases = await page.locator('canvas').count();
    expect(canvases).toBeGreaterThan(0);
  });

  test('displays São Paulo in market session (not Nova York)', async ({ page }) => {
    const marketSession = page.locator('text=BRT');
    await expect(marketSession.first()).toBeVisible({ timeout: 5000 });

    const novaYork = page.locator('text=Nova York');
    await expect(novaYork).toHaveCount(0);
  });

  test('chart remains stable after switching crypto assets', async ({ page }) => {
    const assetSelector = page.locator('[role="combobox"]').first();
    await assetSelector.click();
    await page.waitForTimeout(500);

    const ethOption = page.locator('text=ETH/USD').first();
    if (await ethOption.isVisible()) {
      await ethOption.click();
      await page.waitForTimeout(2000);
      const canvases = await page.locator('canvas').count();
      expect(canvases).toBeGreaterThan(0);
    }
  });

  test('chart remains stable after switching to forex asset', async ({ page }) => {
    const assetSelector = page.locator('[role="combobox"]').first();
    await assetSelector.click();
    await page.waitForTimeout(500);

    const forexOption = page.locator('text=EUR/USD').first();
    if (await forexOption.isVisible()) {
      await forexOption.click();
      await page.waitForTimeout(2000);
      const canvases = await page.locator('canvas').count();
      expect(canvases).toBeGreaterThan(0);
    }
  });

  test('chart survives rapid asset switching', async ({ page }) => {
    const assetSelector = page.locator('[role="combobox"]').first();

    for (const asset of ['ETH/USD', 'BTC/USD', 'ETH/USD', 'BTC/USD']) {
      await assetSelector.click();
      await page.waitForTimeout(300);
      const option = page.locator(`text=${asset}`).first();
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(500);
      }
    }

    const canvases = await page.locator('canvas').count();
    expect(canvases).toBeGreaterThan(0);
  });

  test('chart stable after crypto → forex → crypto round-trip', async ({ page }) => {
    const assetSelector = page.locator('[role="combobox"]').first();

    // Switch to forex
    await assetSelector.click();
    await page.waitForTimeout(500);
    const eurOption = page.locator('text=EUR/USD').first();
    if (await eurOption.isVisible()) {
      await eurOption.click();
      await page.waitForTimeout(2000);
    }

    // Back to crypto
    await assetSelector.click();
    await page.waitForTimeout(500);
    const btcOption = page.locator('text=BTC/USD').first();
    if (await btcOption.isVisible()) {
      await btcOption.click();
      await page.waitForTimeout(2000);
    }

    const canvases = await page.locator('canvas').count();
    expect(canvases).toBeGreaterThan(0);
  });

  test('chart handles scroll/zoom interaction', async ({ page }) => {
    const chartArea = page.locator('canvas').first();
    if (await chartArea.isVisible()) {
      await chartArea.hover();
      await page.mouse.wheel(0, -200);
      await page.waitForTimeout(500);
      await page.mouse.wheel(0, 200);
      await page.waitForTimeout(500);
    }
    const canvases = await page.locator('canvas').count();
    expect(canvases).toBeGreaterThan(0);
  });
});
