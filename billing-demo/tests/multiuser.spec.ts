import { test, expect } from '@playwright/test';
import { switchUser, loadDemo, goTo, topUpService, confirm1C, active } from './fixtures';

test.describe('Участник с несколькими пользователями', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('');
    await page.waitForSelector('.user-btn', { state: 'visible' });
    await loadDemo(page);
  });

  test('Администратор видит всех пользователей участника в строке счёта', async ({ page }) => {
    // participantId:4 (ООО «Сидоров и Партнёры») — 3 пользователя: ОТ 1, ОТ 3 (Сидоров), ОТ 4 (Сидоров)
    await switchUser(page, 'Адм');
    await goTo(page, 'Счета участников');
    const row = active(page)
      .locator('tr', { hasText: 'ОТ 3 (Сидоров)' })
      .filter({ hasText: 'Для услуг' });
    await expect(row).toContainText('ОТ 1');
    await expect(row).toContainText('ОТ 4 (Сидоров)');
  });

  test('Два пользователя одного участника видят одинаковый баланс счёта услуг', async ({ page }) => {
    await switchUser(page, 'ОТ 3 (Сидоров)');
    await goTo(page, 'Финансы');
    const balance3 = await active(page).locator('.acc-card.type-02 .acc-free').textContent() ?? '';

    await switchUser(page, 'ОТ 4 (Сидоров)');
    await goTo(page, 'Финансы');
    const balance4 = await active(page).locator('.acc-card.type-02 .acc-free').textContent() ?? '';

    expect(balance3).toBe(balance4);
  });

  test('Два пользователя одного участника видят одинаковый номер счёта', async ({ page }) => {
    await switchUser(page, 'ОТ 3 (Сидоров)');
    await goTo(page, 'Финансы');
    const num3 = await active(page).locator('.acc-card.type-02 .acc-num').textContent() ?? '';

    await switchUser(page, 'ОТ 4 (Сидоров)');
    await goTo(page, 'Финансы');
    const num4 = await active(page).locator('.acc-card.type-02 .acc-num').textContent() ?? '';

    expect(num3).toBe(num4);
    expect(num3.trim()).not.toBe('');
  });

  test('Пополнение от одного пользователя видно на счёте другого пользователя того же участника', async ({ page }) => {
    await switchUser(page, 'ОТ 3 (Сидоров)');
    await goTo(page, 'Финансы');
    const freeBefore = await active(page).locator('.acc-card.type-02 .acc-free').textContent() ?? '';

    await topUpService(page, '20000');
    await confirm1C(page);

    await switchUser(page, 'ОТ 4 (Сидоров)');
    await goTo(page, 'Финансы');
    const freeAfter = await active(page).locator('.acc-card.type-02 .acc-free').textContent() ?? '';

    expect(freeAfter).not.toBe(freeBefore);
  });

});
