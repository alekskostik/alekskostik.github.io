import { test, expect } from '@playwright/test';
import { switchUser, loadDemo, goTo, topUpService, open1C, confirm1C, submitBid, finishAuction, signContract, closeModal, active } from './fixtures';

async function setupInvoice(page: import('@playwright/test').Page, amount: string) {
  await switchUser(page, 'УТ 1');
  await submitBid(page, '481201');
  await switchUser(page, 'ОТ 1');
  await finishAuction(page, '481201');
  await signContract(page, '481201');
  await open1C(page);
  const tiItem = page.locator('.inv-1c-item', { hasText: '481201' });
  await tiItem.locator('input[type=number]').fill(amount);
  await tiItem.locator('.btn-confirm').click();
  await page.waitForTimeout(300);
}

test.describe('Счета за торги', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.user-btn', { state: 'visible' });
    await loadDemo(page);
  });

  test('После подписания договора счёт в статусе «ожидает выставления»', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await submitBid(page, '481201');
    await switchUser(page, 'ОТ 1');
    await finishAuction(page, '481201');
    await signContract(page, '481201');

    await goTo(page, 'Заявки и счета');
    const inv = active(page).locator('.inv-item', { hasText: 'торгов № 481201' });
    await expect(inv).toContainText('ожидает выставления');
    await expect(inv).toContainText('Сумма не указана');
  });

  test('После выставления ОТ видит сумму и кнопку оплаты', async ({ page }) => {
    await setupInvoice(page, '25000');
    await switchUser(page, 'ОТ 1');
    await goTo(page, 'Заявки и счета');
    const inv = active(page).locator('.inv-item', { hasText: 'торгов № 481201' });
    await expect(inv).toContainText('выставлен');
    await expect(inv.locator('button', { hasText: 'Оплатить' })).toBeVisible();
  });

  test('ОТ оплачивает счёт со счёта услуг', async ({ page }) => {
    await setupInvoice(page, '12000');
    await switchUser(page, 'ОТ 1');
    await topUpService(page, '12000');
    await confirm1C(page);

    await switchUser(page, 'ОТ 1');
    await goTo(page, 'Заявки и счета');
    page.once('dialog', d => d.accept());
    await active(page).locator('.inv-item', { hasText: 'торгов № 481201' })
      .locator('button', { hasText: 'Оплатить' }).click();
    await page.waitForTimeout(300);
    await expect(active(page).locator('.inv-item', { hasText: 'торгов № 481201' }))
      .toContainText('оплачен');
  });

  test('Бухгалтер помечает «оплачено вне ЭТП»', async ({ page }) => {
    await setupInvoice(page, '15000');
    page.once('dialog', d => d.accept());
    await page.locator('button', { hasText: 'Оплачено вне ЭТП' }).first().click();
    await page.waitForTimeout(300);

    await switchUser(page, 'ОТ 1');
    await goTo(page, 'Заявки и счета');
    await expect(active(page).locator('.inv-item', { hasText: 'торгов № 481201' }))
      .toContainText('оплачено вне ЭТП');
  });

  test('ОТ запрашивает акт после оплаты', async ({ page }) => {
    await setupInvoice(page, '10000');
    page.once('dialog', d => d.accept());
    await page.locator('button', { hasText: 'Оплачено вне ЭТП' }).first().click();
    await page.waitForTimeout(300);

    await switchUser(page, 'ОТ 1');
    await goTo(page, 'Заявки и счета');
    await active(page).locator('.inv-item', { hasText: 'торгов № 481201' })
      .locator('button', { hasText: 'Запросить акт' }).click();
    await page.waitForTimeout(300);
    await expect(active(page).locator('.inv-item', { hasText: 'торгов № 481201' }))
      .toContainText('Акт запрошен');
  });

});
