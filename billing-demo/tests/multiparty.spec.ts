import { test, expect } from '@playwright/test';
import { switchUser, loadDemo, goTo, submitBid, finishAuction, signContract, active } from './fixtures';

test.describe('Несколько участников', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('');
    await page.waitForSelector('.user-btn', { state: 'visible' });
    await loadDemo(page);
  });

  test('Два участника — ОТ видит 2 заявки', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await submitBid(page, '481201');
    await switchUser(page, 'УТ 2');
    await submitBid(page, '481201');

    await switchUser(page, 'ОТ 1');
    await goTo(page, 'Мои торги');
    await expect(
      active(page).locator('.ot-auc-detail', { hasText: '481201' }).locator('.app-row')
    ).toHaveCount(2);
  });

  test('После договора счёт за торги в статусе «ожидает выставления»', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await submitBid(page, '481201');
    await switchUser(page, 'ОТ 1');
    await finishAuction(page, '481201');
    await signContract(page, '481201');

    await goTo(page, 'Заявки и счета');
    await expect(active(page).locator('.inv-item', { hasText: 'торгов № 481201' }))
      .toContainText('ожидает выставления');
  });

  test('Торги УТ+ОТ: другой УТ видит и подаёт заявку', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Торги');
    await expect(active(page).locator('.auc-card', { hasText: '481205' })).toBeVisible();
    await submitBid(page, '481205');

    await switchUser(page, 'УТ+ОТ');
    await goTo(page, 'Торги / Мои торги');
    await expect(
      active(page).locator('.ot-auc-detail', { hasText: '481205' }).locator('.app-row')
    ).toHaveCount(1);
  });

});
