import { test, expect } from '@playwright/test';
import { switchUser, loadDemo, goTo } from './fixtures';

test.describe('Задатки — базовый флоу', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.user-btn', { state: 'visible' });
    await loadDemo(page);
  });

  test('УТ 1: подача заявки резервирует задаток', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Торги');

    const auctionCard = page.locator('.auc-card', { hasText: '481201' });
    await auctionCard.locator('button', { hasText: 'Подать заявку' }).click();

    const modal = page.locator('.modal-overlay.open');
    await expect(modal).toBeVisible();
    await expect(modal.locator('input[type=number]')).toHaveValue('150000');

    await modal.locator('button', { hasText: 'Подать заявку и внести задаток' }).click();
    await page.waitForTimeout(800);

    await expect(modal.locator('.st')).toHaveText('Заявка подана');
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    await goTo(page, 'Финансы');
    const depositCard = page.locator('.acc-card.type-03');
    await expect(depositCard.locator('.acc-sub.amber')).toContainText('150');
  });

  test('Кнопка "Подать заявку" исчезает после подачи', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Торги');

    const auctionCard = page.locator('.auc-card', { hasText: '481201' });
    await auctionCard.locator('button', { hasText: 'Подать заявку' }).click();

    const modal = page.locator('.modal-overlay.open');
    await modal.locator('button', { hasText: 'Подать заявку и внести задаток' }).click();
    await page.waitForTimeout(800);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    await expect(auctionCard.locator('button', { hasText: 'Подать заявку' })).toHaveCount(0);
    await expect(auctionCard.locator('.my-app-badge')).toBeVisible();
    await expect(auctionCard.locator('.my-app-badge')).toContainText('150 000');
  });

  test('ОТ 1 видит заявку после подачи УТ 1', async ({ page }) => {
    await switchUser(page, 'УТ 1');
    await goTo(page, 'Торги');
    const auctionCard = page.locator('.auc-card', { hasText: '481201' });
    await auctionCard.locator('button', { hasText: 'Подать заявку' }).click();
    const modal = page.locator('.modal-overlay.open');
    await modal.locator('button', { hasText: 'Подать заявку и внести задаток' }).click();
    await page.waitForTimeout(800);
    await modal.locator('button', { hasText: 'Закрыть' }).click();

    await switchUser(page, 'ОТ 1');
    await goTo(page, 'Мои торги');

    const otCard = page.locator('.ot-auc-detail', { hasText: '481201' });
    await expect(otCard.locator('.app-row')).toHaveCount(1);
    await expect(otCard.locator('.app-row')).toContainText('Иванов');
    await expect(otCard.locator('.app-row-sum')).toContainText('150 000');
  });

  test('ОТ 1 не может опубликовать протокол без заявок', async ({ page }) => {
    await switchUser(page, 'ОТ 1');
    await goTo(page, 'Мои торги');

    const otCard = page.locator('.ot-auc-detail', { hasText: '481201' });
    await expect(otCard.locator('button', { hasText: 'Завершить' })).toHaveCount(0);
  });

});
