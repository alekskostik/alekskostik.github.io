import { test, expect } from '@playwright/test';
import { switchUser, loadDemo, goTo, open1C, confirm1C, closeModal, active } from './fixtures';

test.describe('БР: оплата услуг', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('');
    await page.waitForSelector('.user-btn', { state: 'visible' });
    await loadDemo(page);
    await switchUser(page, 'БР 1');
    await page.waitForSelector('.ni', { state: 'visible' });
  });

  test('Навигация: «Оплата услуг» есть, «Торги» — скрыты', async ({ page }) => {
    await expect(page.locator('.ni', { hasText: 'Оплата услуг' })).toBeVisible();
    await expect(page.locator('.ni', { hasText: 'Торги' })).toBeHidden();
  });

  test('После нажатия «Заказать» — кнопка пропадает, статус «В обработке»', async ({ page }) => {
    await goTo(page, 'Оплата услуг');
    await active(page).locator('.inv-item', { hasText: 'Ускоренная регистрация' })
      .locator('button', { hasText: 'Заказать' }).click();
    await page.waitForTimeout(300);
    await closeModal(page);

    await expect(active(page).locator('.inv-item', { hasText: 'Ускоренная регистрация' })
      .locator('button', { hasText: 'Заказать' })).toBeHidden();
    await expect(active(page).locator('.inv-item', { hasText: 'Ускоренная регистрация' }))
      .toContainText('В обработке');
  });

  test('После подтверждения в 1С — статус «Оплачено ✓»', async ({ page }) => {
    await goTo(page, 'Оплата услуг');
    await active(page).locator('.inv-item', { hasText: 'Экспресс-допуск к торгам' })
      .locator('button', { hasText: 'Заказать' }).click();
    await page.waitForTimeout(300);
    await closeModal(page);
    await confirm1C(page);
    await switchUser(page, 'БР 1');
    await goTo(page, 'Оплата услуг');
    await expect(active(page).locator('.inv-item', { hasText: 'Экспресс-допуск к торгам' }))
      .toContainText('Оплачено ✓');
  });

  test('Оплаченная услуга видна в «Заявки и счета» без пополнений счёта', async ({ page }) => {
    await goTo(page, 'Оплата услуг');
    await active(page).locator('.inv-item', { hasText: 'Ускоренная регистрация' })
      .locator('button', { hasText: 'Заказать' }).click();
    await page.waitForTimeout(300);
    await closeModal(page);
    await confirm1C(page);
    await switchUser(page, 'БР 1');
    await goTo(page, 'Заявки и счета');
    await expect(active(page).locator('.inv-item', { hasText: 'Ускоренная регистрация' }))
      .toBeVisible();
    // пополнений счёта услуг (01) не должно быть видно
    const items = active(page).locator('.inv-item');
    const count = await items.count();
    for (let i = 0; i < count; i++) {
      await expect(items.nth(i)).not.toContainText('Пополнение счёта услуг');
    }
  });

  test('Пополнение задатка видно в истории операций', async ({ page }) => {
    await goTo(page, 'Финансы');
    await active(page).locator('.acc-card.type-03')
      .locator('button', { hasText: '+ Пополнить' }).click();
    const modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('50000');
    await modal.locator('button', { hasText: 'Сформировать заявку' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();
    await confirm1C(page);
    await switchUser(page, 'БР 1');
    await goTo(page, 'Финансы');
    await expect(active(page).locator('.htable tbody tr', { hasText: 'задатков' }).first())
      .toBeVisible();
  });

});
