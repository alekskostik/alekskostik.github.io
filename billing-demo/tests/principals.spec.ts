import { test, expect } from '@playwright/test';
import { switchUser, loadDemo, goTo, confirm1C, submitBid, active } from './fixtures';

test.describe('Принципалы', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('');
    await page.waitForSelector('.user-btn', { state: 'visible' });
    await loadDemo(page);
  });

  test('Агент видит выбор принципала в модале пополнения задатка', async ({ page }) => {
    // УТ 1 — isAgent:true, верифицированный принципал ООО «Гарант Плюс»
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    await active(page).locator('.acc-card.type-03').locator('button', { hasText: '+ Пополнить' }).click();
    const modal = page.locator('.modal-overlay.open');
    await expect(modal.locator('label', { hasText: 'Принципал' })).toBeVisible();
    await expect(modal.locator('option', { hasText: /Гарант Плюс/ })).toHaveCount(1);
    await modal.locator('button', { hasText: 'Закрыть' }).click();
  });

  test('Не-агент не видит выбор принципала при пополнении задатка', async ({ page }) => {
    // УТ 2 — isAgent:false
    await switchUser(page, 'УТ 2');
    await goTo(page, 'Финансы');
    await active(page).locator('.acc-card.type-03').locator('button', { hasText: '+ Пополнить' }).click();
    const modal = page.locator('.modal-overlay.open');
    await expect(modal.locator('label', { hasText: 'Принципал' })).not.toBeVisible();
    await modal.locator('button', { hasText: 'Закрыть' }).click();
  });

  test('Пополнение с принципалом — задаток на торги получает метку принципала', async ({ page }) => {
    await switchUser(page, 'УТ 1');

    // Пополняем задатковый счёт с привязкой к принципалу
    await goTo(page, 'Финансы');
    await active(page).locator('.acc-card.type-03').locator('button', { hasText: '+ Пополнить' }).click();
    const modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('150000');
    await modal.locator('[x-model="fdPrincipalId"]').waitFor({ state: 'visible' });
    await modal.locator('[x-model="fdPrincipalId"]').evaluate((el) => {
      (el as any).value = 'PRC-UT1-01';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await page.waitForTimeout(100);
    await modal.locator('button', { hasText: 'Сформировать заявку' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    // Подтверждаем в 1С — создаётся аллокация с principalId
    await confirm1C(page);
    await switchUser(page, 'УТ 1');

    // Подаём заявку на торги — задаток наследует principalId аллокации
    await submitBid(page, '481201');

    await goTo(page, 'Задатки');
    await expect(active(page).locator('.dep-item', { hasText: '481201' }))
      .toContainText('Гарант Плюс');
  });

});
