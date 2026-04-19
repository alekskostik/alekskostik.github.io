import { test, expect } from '@playwright/test';
import { switchUser, loadDemo, goTo, topUpService, topUpDeposit, open1C, confirm1C, active } from './fixtures';

test.describe('Пополнение и вывод', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.user-btn', { state: 'visible' });
    await loadDemo(page);
  });

  test('Пополнение: номер заявки P- на шаге 2 модала', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    await active(page).locator('.acc-card.type-02')
      .locator('button', { hasText: '+ Пополнить' }).click();
    const modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('5000');
    await modal.locator('button', { hasText: 'Сформировать заявку' }).click();
    await page.waitForTimeout(600);
    const reqId = await modal.locator('.rv.hl').first().textContent() ?? '';
    expect(reqId).toMatch(/P-\d{8}-\d{6}/);
    await modal.locator('button', { hasText: 'Закрыть' }).click();
  });

  test('Пополнение задаткового видно в 1С как задатковый счёт', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await topUpDeposit(page, '50000');
    await open1C(page);
    const row = page.locator('.pg.active .inv-1c-item').first();
    await expect(row).toBeVisible({ timeout: 8000 });
    await expect(row).toContainText('задатк', { ignoreCase: true });
  });

  test('Вывод уменьшает свободный баланс (после пополнения)', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await topUpService(page, '10000');
    await confirm1C(page);

    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    const freeBefore = await active(page).locator('.acc-card.type-02 .acc-free').textContent() ?? '';

    await active(page).locator('.acc-card.type-02')
      .locator('button', { hasText: '↑ Вывести' }).click();
    const modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('5000');
    await modal.locator('button', { hasText: 'Подать заявление' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    const freeAfter = await active(page).locator('.acc-card.type-02 .acc-free').textContent() ?? '';
    expect(freeAfter).not.toBe(freeBefore);
  });

  test('Нельзя вывести больше баланса — ошибка', async ({ page }) => {
    // пополняем минимум чтобы кнопка появилась
    await switchUser(page, 'УТ 1');
    await topUpService(page, '1000');
    await confirm1C(page);

    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    await active(page).locator('.acc-card.type-02')
      .locator('button', { hasText: '↑ Вывести' }).click();
    const modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('99999999');
    await modal.locator('button', { hasText: 'Подать заявление' }).click();
    await expect(modal.locator('.err-msg')).toBeVisible();
  });

  test('БР: пополнение задатка видно в истории операций', async ({ page }) => {
    await switchUser(page, 'БР 1');
    await topUpDeposit(page, '50000');
    await confirm1C(page);
    await switchUser(page, 'БР 1');
    await goTo(page, 'Финансы');
    await expect(
      active(page).locator('.htable tbody tr', { hasText: 'задатков' }).first()
    ).toBeVisible();
  });

});
