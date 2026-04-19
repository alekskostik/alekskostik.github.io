import { test, expect } from '@playwright/test';
import { switchUser, loadDemo, goTo, topUpService, topUpDeposit, open1C, confirm1C, active } from './fixtures';

test.describe('Обработка 1С', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.user-btn', { state: 'visible' });
    await loadDemo(page);
  });

  test('Заявка на пополнение появляется в таблице с номером P-', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await topUpService(page, '5000');
    await open1C(page);
    // ждём появления строки — таблица рендерится через x-if
    const row = page.locator('.pg.active .inv-1c-item').first();
    await expect(row).toBeVisible({ timeout: 8000 });
    await expect(row).toContainText('P-');
  });

  test('Подтверждение зачисляет средства на счёт', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    const freeBefore = await active(page).locator('.acc-card.type-02 .acc-free').textContent() ?? '';
    await topUpService(page, '10000');
    await confirm1C(page);
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    const freeAfter = await active(page).locator('.acc-card.type-02 .acc-free').textContent() ?? '';
    expect(freeAfter).not.toBe(freeBefore);
  });

  test('Отклонение заявки — средства не поступают', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    const freeBefore = await active(page).locator('.acc-card.type-02 .acc-free').textContent() ?? '';
    await topUpService(page, '10000');
    await open1C(page);
    page.once('dialog', d => d.accept());
    await page.locator('.btn-reject').first().click();
    await page.waitForTimeout(300);
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    const freeAfter = await active(page).locator('.acc-card.type-02 .acc-free').textContent() ?? '';
    expect(freeAfter).toBe(freeBefore);
  });

  test('Пополнение задаткового видно как задатковый счёт в 1С', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await topUpDeposit(page, '50000');
    await open1C(page);
    const row = page.locator('.pg.active .inv-1c-item').first();
    await expect(row).toBeVisible({ timeout: 8000 });
    await expect(row).toContainText('задатк', { ignoreCase: true });
  });

  test('Вывод: транзакция завершена после подтверждения', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await topUpService(page, '10000');
    await confirm1C(page);

    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    await active(page).locator('.acc-card.type-02')
      .locator('button', { hasText: '↑ Вывести' }).click();
    const modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('5000');
    await modal.locator('button', { hasText: 'Подать заявление' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();
    await confirm1C(page);

    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    await expect(
      active(page).locator('.htable tbody tr', { hasText: 'Вывод' }).first().locator('.badge')
    ).toContainText('завершена');
  });

  test('Фильтр по счёту ЦДТ в обработанных', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await topUpService(page, '5000');
    await confirm1C(page);
    await open1C(page);
    await page.locator('button', { hasText: 'Р/с ЦДТ' }).click();
    await expect(active(page).locator('.done-list .admin-table tbody tr').first()).toBeVisible();
  });

});
