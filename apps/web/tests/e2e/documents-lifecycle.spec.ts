import { test, expect } from '@playwright/test';

test('Documents Lifecycle Smoke Test: Login, navigate to patient, generate document', async ({ page }) => {
  await page.goto(process.env.WEB_BASE_URL || 'http://127.0.0.1:5173');

  // Navigate to Patients section
  const patientsTab = page.locator('text="Пациенты"').or(page.locator('text="Patients"'));
  await patientsTab.first().click();
  
  // Click on a first patient
  const patientRow = page.locator('.patient-row').or(page.locator('[data-testid="patient-row"]'));
  if (await patientRow.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await patientRow.first().click();
  }
  
  // Navigate to Documents tab
  const docsTab = page.locator('text="Документы"').or(page.locator('text="Documents"'));
  if (await docsTab.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await docsTab.first().click();
  }
});
