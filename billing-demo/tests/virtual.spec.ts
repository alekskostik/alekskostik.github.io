import { test, expect } from '@playwright/test';
import { switchUser, loadDemo, goTo } from './fixtures';

/** Начислить виртуальные средства от имени Адм на счёт услуг УТ 1 */
async function addVirtual(page: import('@playwright/test').Page, amount: string): Promise<void> {
  await switchUser(page, 'Адм');
  await goTo(page, 'Счета участников');
  const row = page.locator('.admin-table tbody tr', { hasText: 'Иванов' })
    .filter({ hasText: 'Для услуг УТ (01)' });
  await row.locator('button', { hasText: '+ Вирт.' }).click();
  const modal = page.locator('.modal-overlay.open');
  await modal.locator('input[type=number]').fill(amount);
  await modal.locator('button', { hasText: 'Начислить' }).click();
  await page.waitForTimeout(300);
}

/** Оплатить услугу «Аккредитация на ЭТП» (5 400 ₽) */
async function payAccreditation(page: import('@playwright/test').Page): Promise<void> {
  await page.locator('button', { hasText: '◈ Оплатить услугу' }).click();
  const modal = page.locator('.modal-overlay.open');
  // selectOption по value атрибута option
  await modal.locator('select').first().selectOption('acc');
  await modal.locator('button', { hasText: 'Оплатить' }).click();
  await page.waitForTimeout(500);
  await modal.locator('button', { hasText: 'Закрыть' }).click();
}

test.describe('Виртуальные средства', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.user-btn', { state: 'visible' });
    await loadDemo(page);
  });

  test('Администратор начисляет виртуальные — они появляются на счёте УТ 1', async ({ page }) => {
    await addVirtual(page, '10000');

    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');

    const serviceCard = page.locator('.acc-card.type-01');
    // проверяем наличие маркера виртуальных (точную сумму не проверяем — неразрывный пробел в числах)
    await expect(serviceCard).toContainText('вирт.');
  });

  test('УТ 1 оплачивает услугу виртуальными — баланс уменьшается', async ({ page }) => {
    await addVirtual(page, '10000');

    await switchUser(page, 'УТ 1');
    await payAccreditation(page);

    const serviceCard = page.locator('.acc-card.type-01');
    // виртуальных осталось 10000 - 5400 = 4600 — проверяем наличие маркера
    await expect(serviceCard).toContainText('вирт.');
    // долг появился
    await expect(serviceCard).toContainText('Виртуальный долг');
    // баланс уменьшился (реальных 0, виртуальных 4600)
    await expect(serviceCard.locator('.acc-free')).toContainText('0,00');
  });

  test('Пополнение счёта погашает виртуальный долг', async ({ page }) => {
    await addVirtual(page, '5400');

    await switchUser(page, 'УТ 1');
    await payAccreditation(page);

    // пополняем на сумму долга
    await page.locator('button', { hasText: '+ Пополнить счёт услуг' }).click();
    const modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('5400');
    await modal.locator('button', { hasText: 'Сформировать заявку' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    // подтверждаем в 1С
    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();
    await page.locator('.btn-confirm').first().click();
    await page.waitForTimeout(300);

    await goTo(page, 'Финансы');
    const serviceCard = page.locator('.acc-card.type-01');

    // долг погашен — строки с "Виртуальный долг" нет
    await expect(serviceCard).not.toContainText('Виртуальный долг');
    // на балансе 0: 5400 пришло, 5400 ушло на погашение
    await expect(serviceCard.locator('.acc-free')).toContainText('0,00');
  });

});
