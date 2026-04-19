import { test, expect } from '@playwright/test';
import { switchUser, goTo, topUpService, topUpDeposit, confirm1C, readBalance1C, active } from './fixtures';

test.describe('Балансы ЦДТ', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('');
    await page.waitForSelector('.user-btn', { state: 'visible' });
    page.once('dialog', d => d.accept());
    await page.locator('button', { hasText: '✕ Сброс данных' }).click();
    await page.waitForTimeout(300);
  });

  test('Начальное состояние: все балансы = 0', async ({ page }) => {
    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();
    expect(await readBalance1C(page, 'Р/с услуг ИП (тип 01)')).toBe(0);
    expect(await readBalance1C(page, 'Р/с услуг ЦДТ')).toBe(0);
    expect(await readBalance1C(page, 'Р/с задатков ЦДТ')).toBe(0);
  });

  test('Р/с услуг ЦДТ растёт только после подтверждения', async ({ page }) => {
    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();
    const before = await readBalance1C(page, 'Р/с услуг ЦДТ');

    await switchUser(page, 'УТ 1');
    await topUpService(page, '10000');

    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();
    expect(await readBalance1C(page, 'Р/с услуг ЦДТ')).toBeCloseTo(before, 0);

    await page.locator('.btn-confirm').first().click();
    await page.waitForTimeout(300);
    expect(await readBalance1C(page, 'Р/с услуг ЦДТ')).toBeCloseTo(before + 10000, 0);
  });

  test('Р/с услуг ЦДТ уменьшается после вывода', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await topUpService(page, '20000');
    await confirm1C(page);
    expect(await readBalance1C(page, 'Р/с услуг ЦДТ')).toBeCloseTo(20000, 0);

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

    expect(await readBalance1C(page, 'Р/с услуг ЦДТ')).toBeCloseTo(15000, 0);
  });

  test('Р/с задатков ЦДТ растёт после пополнения задаткового', async ({ page }) => {
    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();
    const before = await readBalance1C(page, 'Р/с задатков ЦДТ');
    await switchUser(page, 'УТ 1');
    await topUpDeposit(page, '100000');
    await confirm1C(page);
    expect(await readBalance1C(page, 'Р/с задатков ЦДТ')).toBeCloseTo(before + 100000, 0);
  });

  test('Незавершённые заявки не меняют баланс', async ({ page }) => {
    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();
    const before = await readBalance1C(page, 'Р/с услуг ЦДТ');
    await switchUser(page, 'УТ 1');
    await topUpService(page, '50000');
    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();
    expect(await readBalance1C(page, 'Р/с услуг ЦДТ')).toBeCloseTo(before, 0);
  });

});
