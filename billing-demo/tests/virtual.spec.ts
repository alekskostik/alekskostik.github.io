import { test, expect } from '@playwright/test';
import { switchUser, loadDemo, goTo, confirm1C, active } from './fixtures';

async function grantVirtual(page: import('@playwright/test').Page, amount: string) {
  await switchUser(page, 'Адм');
  await goTo(page, 'Счета участников');
  const row = active(page).locator('.admin-table tbody tr')
    .filter({ hasText: 'Иванов' })
    .filter({ hasText: 'Для услуг' })
    .first();
  await row.locator('button', { hasText: 'Вирт.' }).click();
  const modal = page.locator('.modal-overlay.open');
  await modal.locator('input[type=number]').fill(amount);
  await modal.locator('button', { hasText: 'Начислить' }).click();
  await page.waitForTimeout(300);
}

test.describe('Виртуальные средства', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.user-btn', { state: 'visible' });
    await loadDemo(page);
  });

  test('Администратор начисляет виртуальные — они видны на счёте', async ({ page }) => {
    await grantVirtual(page, '10000');
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    await expect(active(page).locator('.acc-card.type-02')).toContainText('вирт.');
  });

test('Оплата услуги виртуальными — долг появляется', async ({ page }) => {
  page.once('dialog', d => d.accept());
  await page.locator('button', { hasText: '✕ Сброс данных' }).click();
  await page.waitForTimeout(300);
  await grantVirtual(page, '10000');
  await switchUser(page, 'УТ 1');
  await page.locator('button', { hasText: '◈ Оплатить услугу' }).click();
  const modal = page.locator('.modal-overlay.open');
  await modal.locator('select').first().selectOption('acc');
  await modal.locator('button', { hasText: 'Оплатить' }).click();
  await page.waitForTimeout(500);
  await modal.locator('button', { hasText: 'Закрыть' }).click();
  await goTo(page, 'Финансы');
  await expect(active(page).locator('.acc-card.type-02')).toContainText('Виртуальный долг');
});

  test('Реальное пополнение гасит виртуальный долг', async ({ page }) => {
    await grantVirtual(page, '5400');
    await switchUser(page, 'УТ 1');
    await page.locator('button', { hasText: '◈ Оплатить услугу' }).click();
    let modal = page.locator('.modal-overlay.open');
    await modal.locator('select').first().selectOption('acc');
    await modal.locator('button', { hasText: 'Оплатить' }).click();
    await page.waitForTimeout(500);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    await goTo(page, 'Финансы');
    await active(page).locator('.acc-card.type-02')
      .locator('button', { hasText: '+ Пополнить' }).click();
    modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('5400');
    await modal.locator('button', { hasText: 'Сформировать заявку' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();
    await confirm1C(page);

    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    await expect(active(page).locator('.acc-card.type-02')).not.toContainText('Виртуальный долг');
  });

});
