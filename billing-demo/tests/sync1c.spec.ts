import { test, expect } from '@playwright/test';
import { switchUser, loadDemo, goTo } from './fixtures';

test.describe('Обработка 1С', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.user-btn', { state: 'visible' });
    await loadDemo(page);
  });

  test('Пополнение УТ 1: заявка появляется в 1С с номером и подтверждается', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await page.locator('button', { hasText: '+ Пополнить счёт услуг' }).click();
    const modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('5000');
    await modal.locator('button', { hasText: 'Сформировать заявку' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();

    // заявка в таблице с номером и датой
    const table = page.locator('.admin-table tbody');
    await expect(table.locator('tr').first()).toBeVisible();
    const firstRow = table.locator('tr').first();
    // номер заявки присутствует (паттерн P-YYYYMMDD-NNNNNN)
    await expect(firstRow.locator('td').first()).toContainText('P-');
    // счёт зачисления
    await expect(firstRow).toContainText('Счёт для услуг УТ');

    // подтверждаем
    await firstRow.locator('.btn-confirm').click();
    await page.waitForTimeout(300);

    // строка исчезла из pending
    const pendingTable = page.locator('.admin-table');
    // либо таблица пуста, либо строки нет
    const rows = await pendingTable.locator('tbody tr').count();
    expect(rows).toBe(0);
  });

  test('Фильтр по счёту работает на обработанных', async ({ page }) => {
    // создаём и подтверждаем заявку УТ (услуги)
    await switchUser(page, 'УТ 1');
    await page.locator('button', { hasText: '+ Пополнить счёт услуг' }).click();
    let modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('1000');
    await modal.locator('button', { hasText: 'Сформировать заявку' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    // создаём заявку ОТ (услуги)
    await switchUser(page, 'ОТ 1');
    await page.locator('button', { hasText: '+ Пополнить счёт услуг' }).click();
    modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('2000');
    await modal.locator('button', { hasText: 'Сформировать заявку' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    // подтверждаем обе в 1С
    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();
    const confirmBtns = page.locator('.btn-confirm');
    await confirmBtns.first().click();
    await page.waitForTimeout(200);
    await confirmBtns.first().click();
    await page.waitForTimeout(200);

    // в обработанных должно быть 2 строки
    const doneTable = page.locator('.done-list .admin-table tbody');
    await expect(doneTable.locator('tr')).toHaveCount(2);

    // фильтр Услуги УТ — 1 строка
    await page.locator('button', { hasText: 'Услуги УТ' }).click();
    await expect(doneTable.locator('tr')).toHaveCount(1);

    // фильтр Услуги ОТ — 1 строка
    await page.locator('button', { hasText: 'Услуги ОТ' }).click();
    await expect(doneTable.locator('tr')).toHaveCount(1);

    // фильтр Все — 2 строки
    await page.locator('button', { hasText: 'Все' }).click();
    await expect(doneTable.locator('tr')).toHaveCount(2);
  });

  test('Отклонение заявки на вывод возвращает средства', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');

    await page.locator('button', { hasText: '↑ Вывести д/с' }).click();
    const modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('5000');
    await modal.locator('button', { hasText: 'Подать заявление' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    // резерв появился
    const serviceCard = page.locator('.acc-card.type-01');
    await expect(serviceCard.locator('.acc-sub.amber')).toBeVisible();

    // отклоняем в 1С
    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();
    await page.locator('.btn-reject').first().click();
    await page.waitForTimeout(300);

    // резерв исчез
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    await expect(serviceCard.locator('.acc-sub.amber')).toHaveCount(0);
  });

  test('Вывод средств: после подтверждения транзакция становится завершена', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');

    await page.locator('button', { hasText: '↑ Вывести д/с' }).click();
    const modal = page.locator('.modal-overlay.open');
    await modal.locator('input[type=number]').fill('5000');
    await modal.locator('button', { hasText: 'Подать заявление' }).click();
    await page.waitForTimeout(600);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    // подтверждаем в 1С
    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();
    await page.locator('.btn-confirm').first().click();
    await page.waitForTimeout(300);

    // в истории операций транзакция вывода должна быть "завершена"
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Финансы');
    const txTable = page.locator('.htable tbody');
    const wdRow = txTable.locator('tr', { hasText: 'Вывод' }).first();
    await expect(wdRow.locator('.badge')).toContainText('завершена');
  });

  test('Счёт за торги: выставляется в 1С и появляется у ОТ', async ({ page }) => {
    // подаём заявку от УТ 1 на торги 481201
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Торги');
    await page.locator('.auc-card', { hasText: '481201' })
      .locator('button', { hasText: 'Подать заявку' }).click();
    const appModal = page.locator('.modal-overlay.open');
    await appModal.locator('button', { hasText: 'Подать заявку и внести задаток' }).click();
    await page.waitForTimeout(800);
    await appModal.locator('button', { hasText: 'Закрыть' }).click();

    // ОТ 1 публикует протокол
    await switchUser(page, 'ОТ 1');
    await goTo(page, 'Мои торги');
    await page.locator('.ot-auc-detail', { hasText: '481201' })
      .locator('button', { hasText: 'Завершить' }).click();
    const finishModal = page.locator('.modal-overlay.open');
    await finishModal.locator('button', { hasText: 'Опубликовать протокол' }).click();
    await page.waitForTimeout(300);

    // ОТ подписывает договор
    await page.locator('.ot-auc-detail', { hasText: '481201' })
      .locator('button', { hasText: 'Подписать договор' }).click();
    const contractModal = page.locator('.modal-overlay.open');
    await contractModal.locator('.contract-option', { hasText: 'победителем' }).click();
    await contractModal.locator('button', { hasText: 'Подтвердить' }).click();
    await page.waitForTimeout(300);

    // в 1С появился блок "Счета за торги"
    await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();
    await expect(page.locator('div', { hasText: 'Счета за торги' })).toBeVisible();

    // выставляем счёт 12000
    const tiInput = page.locator('.inv-1c-item input[type=number]').first();
    await tiInput.fill('12000');
    await page.locator('.btn-confirm', { hasText: 'Выставить' }).click();
    await page.waitForTimeout(300);

    // у ОТ 1 в Заявках счёт появился
    await switchUser(page, 'ОТ 1');
    await goTo(page, 'Заявки и счета');
    await expect(page.locator('.stitle', { hasText: 'Счета за проведение торгов' })).toBeVisible();
    await expect(page.locator('.inv-item', { hasText: 'Счёт за проведение торгов' })).toBeVisible();
  });

});
