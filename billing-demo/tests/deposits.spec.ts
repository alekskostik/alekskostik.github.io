import { test, expect } from '@playwright/test';
import { switchUser, loadDemo, goTo, submitBid, finishAuction, active } from './fixtures';

test.describe('Задатки', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.user-btn', { state: 'visible' });
    await loadDemo(page);
  });

  test('Подача заявки резервирует задаток у УТ', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    const freeBefore = parseFloat(
      (await active(page).locator('.acc-card.type-03 .acc-free').textContent() ?? '0')
        .replace(/[^\d,]/g,'').replace(',','.')
    ) || 0;

    await submitBid(page, '481201');

    await goTo(page, 'Финансы');
    const freeAfter = parseFloat(
      (await active(page).locator('.acc-card.type-03 .acc-free').textContent() ?? '0')
        .replace(/[^\d,]/g,'').replace(',','.')
    ) || 0;
    expect(freeAfter).toBeLessThan(freeBefore);

    await goTo(page, 'Задатки');
    await expect(active(page).locator('.dep-item', { hasText: '481201' }))
      .toContainText('зарезервирован');
  });

  test('После протокола: победитель — переведён, второй — удерживается', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await submitBid(page, '481201');
    await switchUser(page, 'УТ 2');
    await submitBid(page, '481201');
    await switchUser(page, 'ОТ 1');
    await finishAuction(page, '481201');

    await switchUser(page, 'УТ 1');
    await goTo(page, 'Задатки');
    await expect(active(page).locator('.dep-item', { hasText: '481201' })).toContainText('переведён');

    await switchUser(page, 'УТ 2');
    await goTo(page, 'Задатки');
    await expect(active(page).locator('.dep-item', { hasText: '481201' })).toContainText('удерживается');
  });

  test('ОТ видит переведённый задаток и кнопку вывода', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await submitBid(page, '481201');
    await switchUser(page, 'ОТ 1');
    await finishAuction(page, '481201');

    await expect(
      active(page).locator('.ot-auc-detail', { hasText: '481201' })
        .locator('button', { hasText: 'Вывести задаток' })
    ).toBeVisible();
  });

  test('Три участника — третий в удерживается после протокола', async ({ page }) => {
    for (const u of ['УТ 1', 'УТ 2', 'УТ 3']) {
      await switchUser(page, u);
      await submitBid(page, '481201');
    }
    await switchUser(page, 'ОТ 1');
    await finishAuction(page, '481201');

    await switchUser(page, 'УТ 3');
    await goTo(page, 'Задатки');
    await expect(active(page).locator('.dep-item', { hasText: '481201' }))
      .toContainText('удерживается');
  });

});
