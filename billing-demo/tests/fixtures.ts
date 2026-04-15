import { Page } from '@playwright/test';

/** Переключить аккаунт в сайдбаре */
export async function switchUser(page: Page, label: string): Promise<void> {
  await page.locator('.user-btn', { hasText: label }).click();
  await page.waitForTimeout(100);
}

/** Загрузить демо-данные */
export async function loadDemo(page: Page): Promise<void> {
  page.once('dialog', d => d.accept());
  await page.locator('button', { hasText: '↓ Демо-данные' }).click();
  await page.waitForTimeout(200);
}

/** Перейти в раздел по названию пункта навигации */
export async function goTo(page: Page, label: string): Promise<void> {
  await page.locator('.ni', { hasText: label }).click();
  await page.waitForTimeout(100);
}

/** Подтвердить browser confirm (одноразово) */
export function acceptConfirm(page: Page): void {
  page.once('dialog', d => d.accept());
}
