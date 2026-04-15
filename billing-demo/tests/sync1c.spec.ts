import { test, expect } from '@playwright/test';
import { switchUser, loadDemo, goTo } from './fixtures';

test.describe('Обработка 1С', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.user-btn', { state: 'visible' });
    await loadDemo(page);
  });

  test('Пополнение УТ 1: заявка появляется в 1С и подтверждается', async ({ page }) => {
    // УТ 1 создаёт заявку на пополнение счёта услуг
    await switchUser(page, 'УТ 1');
    await page.locator('button', { hasText: '+ Пополнить счёт услуг' }).click();
    const modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('5000');
    await modal.locator('button', { hasText: 'Сформировать заявку' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    // открываем 1С
    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();

    // заявка отображается в списке ожидающих
    const pendingItem = page.locator('.inv-1c-item').first();
    await expect(pendingItem).toBeVisible();
    await expect(pendingItem).toContainText('Пополнение счёта услуг');

    // колонка счёта зачисления показывает правильный тип
    await expect(pendingItem).toContainText('Счёт для услуг УТ');

    // подтверждаем
    await pendingItem.locator('.btn-confirm').click();
    await page.waitForTimeout(300);

    // заявка исчезла из ожидающих
    await expect(page.locator('.inv-1c-item')).toHaveCount(0);

    // баланс УТ 1 вырос на 5000
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    const serviceCard = page.locator('.acc-card.type-01');
    await expect(serviceCard).toContainText('30'); // было 25000 + 5000 = 30000
  });

  test('Фильтр по счёту — показывает только нужные заявки', async ({ page }) => {
    // создаём две заявки: УТ (услуги) и УТ (задаток)
    await switchUser(page, 'УТ 1');
    await page.locator('button', { hasText: '+ Пополнить счёт услуг' }).click();
    let modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('1000');
    await modal.locator('button', { hasText: 'Сформировать заявку' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    await page.locator('button', { hasText: '+ Пополнить задатковый' }).click();
    modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('2000');
    await modal.locator('button', { hasText: 'Сформировать заявку' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    // открываем 1С — должно быть 2 заявки
    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();
    await expect(page.locator('.inv-1c-item')).toHaveCount(2);

    // фильтруем по "Услуги УТ" — должна остаться 1
    await page.locator('button', { hasText: 'Услуги УТ' }).click();
    await expect(page.locator('.inv-1c-item')).toHaveCount(1);
    await expect(page.locator('.inv-1c-item').first()).toContainText('Счёт для услуг УТ');

    // фильтруем по "Задатки" — должна остаться 1
    await page.locator('button', { hasText: 'Задатки' }).click();
    await expect(page.locator('.inv-1c-item')).toHaveCount(1);
    await expect(page.locator('.inv-1c-item').first()).toContainText('Счёт задатков');

    // сбрасываем фильтр — снова 2
    await page.locator('button', { hasText: 'Все' }).click();
    await expect(page.locator('.inv-1c-item')).toHaveCount(2);
  });

  test('Отклонение заявки возвращает средства', async ({ page }) => {
    await switchUser(page, 'УТ 1');

    // запоминаем баланс до вывода
    await goTo(page, 'Финансы');
    const serviceCard = page.locator('.acc-card.type-01');

    // создаём заявку на вывод
    await page.locator('button', { hasText: '↑ Вывести д/с' }).click();
    const modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('5000');
    await modal.locator('button', { hasText: 'Подать заявление' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    // в резерве появилось 5000
    await expect(serviceCard.locator('.acc-sub.amber')).toContainText('5');

    // отклоняем в 1С
    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();
    await page.locator('.btn-reject').first().click();
    await page.waitForTimeout(300);

    // возвращаемся, проверяем что резерв исчез
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    await expect(serviceCard.locator('.acc-sub.amber')).toHaveCount(0);
  });

});
