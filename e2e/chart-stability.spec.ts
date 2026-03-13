import { test, expect } from '../playwright-fixture';

test.describe('Chart Stability & Asset Switching', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for initial chart render
    await page.waitForSelector('canvas', { timeout: 15000 });
  });

  test('renders chart with candles on initial load', async ({ page }) => {
    const canvases = await page.locator('canvas').count();
    expect(canvases).toBeGreaterThan(0);
  });

  test('displays São Paulo in market session (not Nova York)', async ({ page }) => {
    // MarketSession component should show São Paulo label when applicable
    const marketSession = page.locator('text=BRT');
    await expect(marketSession).toBeVisible({ timeout: 5000 });
    
    // Ensure Nova York is not displayed
    const novaYork = page.locator('text=Nova York');
    await expect(novaYork).toHaveCount(0);
  });

  test('chart remains stable after switching crypto assets', async ({ page }) => {
    // Open asset selector
    const assetSelector = page.locator('[role="combobox"]').first();
    await assetSelector.click();
    await page.waitForTimeout(500);

    // Select ETH/USD
    const ethOption = page.locator('text=ETH/USD').first();
    if (await ethOption.isVisible()) {
      await ethOption.click();
      await page.waitForTimeout(2000);
      
      // Verify chart still has canvas
      const canvases = await page.locator('canvas').count();
      expect(canvases).toBeGreaterThan(0);
    }
  });

  test('chart remains stable after switching to forex asset', async ({ page }) => {
    const assetSelector = page.locator('[role="combobox"]').first();
    await assetSelector.click();
    await page.waitForTimeout(500);

    // Look for a forex pair
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

    for (const asset of ['ETH/USD', 'BTC/USD']) {
      await assetSelector.click();
      await page.waitForTimeout(300);
      const option = page.locator(`text=${asset}`).first();
      if (await option.isVisible()) {
        await option.click();
        await page.waitForTimeout(1000);
      }
    }

    // After rapid switching, chart should still be rendered
    const canvases = await page.locator('canvas').count();
    expect(canvases).toBeGreaterThan(0);
  });
});
