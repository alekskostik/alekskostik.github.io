import { Page } from '@playwright/test';

export async function switchUser(page: Page, label: string): Promise<void> {
  await page.locator('.user-btn', { hasText: label }).click();
  await page.waitForTimeout(150);
}

export async function loadDemo(page: Page): Promise<void> {
  // обе кнопки вызывают confirm() — регистрируем обработчик на каждую
  page.once('dialog', d => d.accept());
  await page.locator('button', { hasText: '✕ Сброс данных' }).click();
  await page.waitForTimeout(300);
  page.once('dialog', d => d.accept());
  await page.locator('button', { hasText: '↓ Демо-данные' }).click();
  await page.waitForTimeout(500);
}

export async function goTo(page: Page, section: string): Promise<void> {
  await page.locator('.ni', { hasText: section }).first().click();
  await page.waitForTimeout(150);
}

export async function open1C(page: Page): Promise<void> {
  await page.locator('button', { hasText: '⚙ Обработка 1С' }).click();
  // ждём пока секция 1С станет активной
  await page.locator('.pg.active').filter({ hasText: 'Ожидают' }).waitFor({ timeout: 5000 }).catch(() => {});
  await page.waitForTimeout(200);
}

/** Закрыть открытый модал если он есть */
export async function closeModal(page: Page): Promise<void> {
  const modal = page.locator('.modal-overlay.open');
  if (await modal.count() > 0) {
    await modal.locator('button', { hasText: 'Закрыть' }).click();
    await page.waitForTimeout(200);
  }
}

export async function topUpService(page: Page, amount: string): Promise<void> {
  await goTo(page, 'Финансы');
  await page.locator('.acc-card.type-02').locator('button', { hasText: '+ Пополнить' }).click();
  const modal = page.locator('.modal-overlay.open');
  await modal.locator('input[type=number]').fill(amount);
  await modal.locator('button', { hasText: 'Сформировать заявку' }).click();
  await page.waitForTimeout(600);
  await modal.locator('button', { hasText: 'Закрыть' }).click();
  await page.waitForTimeout(150);
}

export async function topUpDeposit(page: Page, amount: string): Promise<void> {
  await goTo(page, 'Финансы');
  await page.locator('.acc-card.type-03').locator('button', { hasText: '+ Пополнить' }).click();
  const modal = page.locator('.modal-overlay.open');
  await modal.locator('input[type=number]').fill(amount);
  await modal.locator('button', { hasText: 'Сформировать заявку' }).click();
  await page.waitForTimeout(600);
  await modal.locator('button', { hasText: 'Закрыть' }).click();
  await page.waitForTimeout(150);
}

export async function confirm1C(page: Page): Promise<void> {
  await open1C(page);
  await page.locator('.btn-confirm').first().click();
  await page.waitForTimeout(300);
}

export async function submitBid(page: Page, auctionId: string): Promise<void> {
  await goTo(page, 'Торги');
  await page.locator('.auc-card', { hasText: auctionId })
    .locator('button', { hasText: 'Подать заявку' }).click();
  const modal = page.locator('.modal-overlay.open');
  await modal.locator('button', { hasText: 'Подать заявку и внести задаток' }).click();
  await page.waitForTimeout(800);
  await modal.locator('button', { hasText: 'Закрыть' }).click();
  await page.waitForTimeout(150);
}

export async function finishAuction(page: Page, auctionId: string): Promise<void> {
  await goTo(page, 'Мои торги');
  await page.locator('.ot-auc-detail', { hasText: auctionId })
    .locator('button', { hasText: 'Завершить приём заявок' }).click();
  const modal = page.locator('.modal-overlay.open');
  await modal.locator('button', { hasText: 'Опубликовать протокол' }).click();
  await page.waitForTimeout(300);
  await closeModal(page);
}

export async function signContract(page: Page, auctionId: string): Promise<void> {
  await page.locator('.ot-auc-detail', { hasText: auctionId })
    .locator('button', { hasText: 'Подписать договор' }).click();
  const modal = page.locator('.modal-overlay.open');
  await modal.locator('.contract-option', { hasText: 'победителем' }).click();
  await modal.locator('button', { hasText: 'Подтвердить' }).click();
  await page.waitForTimeout(300);
  await closeModal(page);
}

export async function readBalance1C(page: Page, title: string): Promise<number> {
  const el = page.getByText(title, { exact: true }).locator('xpath=following-sibling::div[1]');
  const text = await el.textContent() ?? '0';
  return parseFloat(text.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
}

/** Активная секция страницы — предотвращает нахождение дублей в скрытых секциях */
export function active(page: Page) {
  return page.locator('.pg.active');
}
