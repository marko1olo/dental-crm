/**
 * scripts/gtm/demo_video_recorder.cjs
 *
 * DENTE Dental CRM — Automated Exhibition Video & Screencast Capture Harness.
 * (MANDATES: 8c, 8e, 8k, 8n, 8y, Order 1094n, Apple HIG Touch Ergonomics)
 *
 * Fully deterministic Playwright automation harness producing studio-grade
 * 15–25 second video recordings (WebM / MP4 / GIF) with smooth cubic bezier
 * cursor interpolation, click ripple physics, and clinical showcase data.
 *
 * SCENARIOS:
 * 1. «Запись на приём за 3 секунды» (Desktop 1920x1080)
 * 2. «Удаленное подписание сметы на смартфоне» (Mobile 390x844 iPhone)
 * 3. «Выписка рецепта у кресла в 1 клик» (Desktop 1920x1080)
 * 4. «Оперативная шторка Copilot (To do)» (Desktop 1920x1080)
 */

const { chromium } = require("playwright");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "../..");
const OUTPUT_DIR = path.resolve(REPO_ROOT, "artifacts/gtm_demos");
const VIDEO_DIR = path.resolve(OUTPUT_DIR, "videos");
const BASE_URL = process.env.DENTE_BASE_URL || "http://127.0.0.1:5173";
const API_URL = process.env.DENTE_API_URL || "http://127.0.0.1:4100";

function ensureDirs() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  if (!fs.existsSync(VIDEO_DIR)) fs.mkdirSync(VIDEO_DIR, { recursive: true });
}

// -------------------------------------------------------------
// SMOOTH BEZIER CURSOR & HUMANIZED MOTION
// -------------------------------------------------------------
function easeInOutCubic(t) {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

let globalMousePos = { x: 100, y: 100 };

async function smoothMouseMove(page, targetX, targetY, durationMs = 600) {
  if (typeof targetX !== "number" || isNaN(targetX) || typeof targetY !== "number" || isNaN(targetY)) {
    throw new Error(`smoothMouseMove received invalid coordinates: (${targetX}, ${targetY})`);
  }

  const startX = typeof globalMousePos.x === "number" && !isNaN(globalMousePos.x) ? globalMousePos.x : 100;
  const startY = typeof globalMousePos.y === "number" && !isNaN(globalMousePos.y) ? globalMousePos.y : 100;
  const deltaX = targetX - startX;
  const deltaY = targetY - startY;

  const distance = Math.hypot(deltaX, deltaY);
  if (distance < 2) {
    await page.mouse.move(targetX, targetY);
    globalMousePos = { x: targetX, y: targetY };
    return;
  }

  const steps = Math.max(25, Math.floor(durationMs / 16));
  const curvature = Math.min(60, distance * 0.15) * (Math.random() > 0.5 ? 1 : -1);

  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    const easeT = easeInOutCubic(t);

    const normalX = -deltaY / distance;
    const normalY = deltaX / distance;
    const curveOffset = Math.sin(Math.PI * easeT) * curvature;

    const currentX = Math.round(startX + deltaX * easeT + normalX * curveOffset);
    const currentY = Math.round(startY + deltaY * easeT + normalY * curveOffset);

    await page.mouse.move(currentX, currentY);
    globalMousePos = { x: currentX, y: currentY };
    await page.waitForTimeout(Math.max(4, Math.floor(durationMs / steps)));
  }

  await page.mouse.move(Math.round(targetX), Math.round(targetY));
  globalMousePos = { x: Math.round(targetX), y: Math.round(targetY) };
  await page.waitForTimeout(60);
}

async function smoothClick(page, targetSelectorOrCoord, options = {}) {
  let cx, cy;
  if (typeof targetSelectorOrCoord === "string") {
    const locator = page.locator(targetSelectorOrCoord).first();
    await locator.waitFor({ state: "visible", timeout: options.timeout || 10000 });
    const box = await locator.boundingBox();
    if (!box) throw new Error(`Bounding box not found for selector: ${targetSelectorOrCoord}`);
    cx = box.x + box.width / 2;
    cy = box.y + box.height / 2;
  } else if (targetSelectorOrCoord && typeof targetSelectorOrCoord.boundingBox === "function") {
    await targetSelectorOrCoord.waitFor({ state: "visible", timeout: options.timeout || 10000 });
    const box = await targetSelectorOrCoord.boundingBox();
    if (!box) throw new Error(`Bounding box not found for locator`);
    cx = box.x + box.width / 2;
    cy = box.y + box.height / 2;
  } else if (targetSelectorOrCoord && typeof targetSelectorOrCoord.x === "number" && typeof targetSelectorOrCoord.y === "number") {
    cx = targetSelectorOrCoord.x;
    cy = targetSelectorOrCoord.y;
  } else {
    throw new Error(`Unsupported target in smoothClick: ${JSON.stringify(targetSelectorOrCoord)}`);
  }

  cx = Math.round(cx);
  cy = Math.round(cy);

  await smoothMouseMove(page, cx, cy, options.moveDuration || 650);
  await page.waitForTimeout(options.preDelay || 120);

  await page.evaluate(({ x, y }) => {
    if (window.__gtmTriggerRipple) window.__gtmTriggerRipple(x, y);
  }, { x: cx, y: cy }).catch(() => {});

  await page.mouse.down();
  await page.waitForTimeout(options.holdDuration || 70);
  await page.mouse.up();
  await page.waitForTimeout(options.postDelay || 250);
}

// -------------------------------------------------------------
// VISUAL CURSOR OVERLAY & RIPPLE INJECTION
// -------------------------------------------------------------
async function injectVisualCursor(page) {
  await page.evaluate(() => {
    if (document.getElementById("gtm-virtual-cursor-layer")) return;

    const layer = document.createElement("div");
    layer.id = "gtm-virtual-cursor-layer";
    layer.style.position = "fixed";
    layer.style.top = "0";
    layer.style.left = "0";
    layer.style.width = "100vw";
    layer.style.height = "100vh";
    layer.style.pointerEvents = "none";
    layer.style.zIndex = "2147483647";
    document.body.appendChild(layer);

    const cursor = document.createElement("div");
    cursor.id = "gtm-virtual-cursor";
    cursor.style.position = "absolute";
    cursor.style.top = "0";
    cursor.style.left = "0";
    cursor.style.width = "24px";
    cursor.style.height = "24px";
    cursor.style.transform = "translate(100px, 100px)";
    cursor.style.transition = "transform 0.04s linear";
    cursor.style.pointerEvents = "none";
    cursor.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" style="filter: drop-shadow(0 2px 5px rgba(0,0,0,0.45));">
        <path d="M5.5 3.5L18.5 13.5L11.5 14.5L8.5 20.5L5.5 3.5Z" fill="#0d9488" stroke="#ffffff" stroke-width="1.8" stroke-linejoin="round"/>
      </svg>
    `;
    layer.appendChild(cursor);

    window.__gtmTriggerRipple = (x, y) => {
      const ripple = document.createElement("div");
      ripple.className = "gtm-click-ripple";
      ripple.style.position = "absolute";
      ripple.style.left = `${x}px`;
      ripple.style.top = `${y}px`;
      ripple.style.width = "12px";
      ripple.style.height = "12px";
      ripple.style.borderRadius = "50%";
      ripple.style.transform = "translate(-50%, -50%) scale(0.5)";
      ripple.style.background = "rgba(13, 148, 136, 0.45)";
      ripple.style.border = "2px solid #0d9488";
      ripple.style.boxShadow = "0 0 14px rgba(13, 148, 136, 0.75)";
      ripple.style.pointerEvents = "none";
      ripple.style.transition = "all 0.45s cubic-bezier(0.1, 0.8, 0.3, 1)";
      layer.appendChild(ripple);

      requestAnimationFrame(() => {
        ripple.style.transform = "translate(-50%, -50%) scale(3.5)";
        ripple.style.opacity = "0";
      });

      setTimeout(() => ripple.remove(), 550);
    };

    document.addEventListener("mousemove", (e) => {
      cursor.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`;
    }, { passive: true });
  });
}

// -------------------------------------------------------------
// CLINIC AUTH & SEED HELPERS
// -------------------------------------------------------------
async function obtainShowcaseAuthTokens() {
  const credentials = [
    { email: "admin@clinic.ru", password: "Password123!" },
    { email: "clinic@example.com", password: "dente2026" },
  ];

  for (const cred of credentials) {
    try {
      const loginRes = await fetch(`${API_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(cred),
      });

      if (loginRes.ok) {
        const data = await loginRes.json();
        console.log(`[GTM-RECORDER] Успешная аутентификация через API: ${cred.email}`);
        return {
          clinicToken: data.clinicToken,
          staffToken: data.staffToken,
          organizationId: data.organizationId || "01a00000-0000-0000-0000-000000000000",
          ownerUserId: data.user?.id || "01a00000-0000-0003-0000-000000000001",
          userName: data.user?.fullName || "Д-р Смирнов Алексей Петрович",
          user: data.user,
        };
      }
    } catch {}
  }

  try {
    const initRes = await fetch(`${API_URL}/api/auth/setup/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        clinicName: "DENTE Showroom Clinic",
        email: `demo-gtm-${Date.now()}@dente.clinic`,
        password: "Password123!",
        ownerName: "Д-р Соколов А. В.",
        ownerPin: "1234",
      }),
    });
    const initData = await initRes.json();
    if (!initData.clinicToken) throw new Error("Failed to init clinic");

    const unlockRes = await fetch(`${API_URL}/api/auth/staff/unlock`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-dente-clinic-token": initData.clinicToken,
      },
      body: JSON.stringify({ userId: initData.ownerUserId, pinCode: "1234" }),
    });
    const unlockData = await unlockRes.json();

    return {
      clinicToken: initData.clinicToken,
      staffToken: unlockData.staffToken,
      organizationId: initData.organizationId,
      ownerUserId: initData.ownerUserId,
      userName: "Д-р Соколов А. В.",
    };
  } catch (err) {
    console.warn("[GTM-RECORDER] Auth fallback:", err.message);
    return {
      clinicToken: "demo-showcase-clinic-token",
      staffToken: "demo-showcase-staff-token",
      organizationId: "01a00000-0000-0000-0000-000000000000",
      ownerUserId: "01a00000-0000-0003-0000-000000000001",
      userName: "Д-р Смирнов Алексей Петрович",
    };
  }
}

async function prepareImplantEstimateToken() {
  try {
    const res = await fetch(`${API_URL}/api/portal/budget/generate-token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizationId: "01a00000-0000-0000-0000-000000000000",
        patientId: "01a00000-0000-0000-0001-000000000001",
        patientFirstName: "Сергей",
        patientPhone: "+79263811234",
        doctorName: "Д-р Громов К. Д.",
        clinicName: "Стоматологическая клиника DENTE",
        customToken: "straumann-blx-36-demo",
        authMethod: "phone_last4",
        items: [
          { title: "Операция дентальной имплантации Straumann BLX (Швейцария)", toothNumber: 36, priceRub: 55000, quantity: 1 },
          { title: "Установка формирователя десны Straumann", toothNumber: 36, priceRub: 12000, quantity: 1 },
          { title: "Индивидуальный циркониевый абатмент на винтовой фиксации", toothNumber: 36, priceRub: 14000, quantity: 1 },
          { title: "Коронка из диоксида циркония Prettau с нанесением керамики", toothNumber: 36, priceRub: 17000, quantity: 1 },
        ],
        totalPriceRub: 98000,
        discountRub: 8000,
      }),
    });
    const data = await res.json();
    return data.token || "straumann-blx-36-demo";
  } catch {
    return "straumann-blx-36-demo";
  }
}

// -------------------------------------------------------------
// SCENARIO 1: ЗАПИСЬ НА ПРИЕМ ЗА 3 СЕКУНДЫ (15 SEC)
// -------------------------------------------------------------
async function recordScenario1_ScheduleQuickBooking(browser, auth) {
  console.log("\n==================================================");
  console.log("🎬 Запуск Сценария 1: «Запись на приём за 3 секунды» (Desktop 1920x1080)");
  console.log("==================================================");

  const scenarioVideoDir = path.join(VIDEO_DIR, "scenario1");
  if (!fs.existsSync(scenarioVideoDir)) fs.mkdirSync(scenarioVideoDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: scenarioVideoDir,
      size: { width: 1920, height: 1080 },
    },
  });

  await context.addInitScript(({ cTok, sTok, oId, uName }) => {
    localStorage.setItem("dente_clinic_token", cTok);
    localStorage.setItem("dente_staff_token", sTok);
    localStorage.setItem("dente_active_session_token", sTok);
    localStorage.setItem("dente_organization_id", oId);
    localStorage.setItem("dente_user_role", "doctor");
    localStorage.setItem("dente_role", "doctor");
    localStorage.setItem("dente_perspective", "doctor");
    localStorage.setItem("dente_user_name", uName);
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_onboarding_dismissed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1, selectedWorkspaceRole: "doctor" }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_demo_showcase", "true");
  }, { cTok: auth.clinicToken, sTok: auth.staffToken, oId: auth.organizationId, uName: auth.userName });

  const page = await context.newPage();
  globalMousePos = { x: 960, y: 300 };

  try {
    await page.goto(`${BASE_URL}/?demo=true#schedule`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector('.schedule-filter-strip, [data-testid="schedule-grid"], .schedule-timeline', { timeout: 35000 });
    await injectVisualCursor(page);
    await page.waitForTimeout(1000);

    // 1. Click Quick Booking CTA button in schedule toolbar
    console.log("-> Клик по кнопке '+ Запись' в тулбаре расписания...");
    const quickBookingBtn = page.locator('[data-testid="schedule-toolbar-primary-quick-booking-btn"], button:has-text("Запись")').first();
    await smoothClick(page, quickBookingBtn, { moveDuration: 750, preDelay: 200, postDelay: 500 });

    // 2. Wait for QuickBookingDrawer to slide in
    await page.waitForSelector('[data-testid="quick-booking-drawer"]', { timeout: 8000 });
    await injectVisualCursor(page);
    await page.waitForTimeout(600);

    // 3. 1-Click Cito Express Patient (Острая боль / Срочный приём)
    const expressBtn = page.locator('[data-testid="quick-booking-cito-express-btn"]').first();
    if (await expressBtn.isVisible().catch(() => false)) {
      console.log("-> 1-клик выбор срочного пациента с острой болью...");
      await smoothClick(page, expressBtn, { moveDuration: 600, preDelay: 150, postDelay: 400 });
    }

    // 4. 1-Click Duration Pill [30 мин]
    console.log("-> 1-клик выбор длительности [30 мин]...");
    const pill30 = page.locator('[data-testid="duration-preset-30"], button:has-text("30 мин")').first();
    if (await pill30.isVisible().catch(() => false)) {
      await smoothClick(page, pill30, { moveDuration: 550, preDelay: 120, postDelay: 350 });
    }

    // 5. Click Save CTA
    console.log("-> Сохранение записи в 1 клик...");
    const saveBtn = page.locator('[data-testid="quick-drawer-save-btn"], button:has-text("Создать запись")').first();
    await smoothClick(page, saveBtn, { moveDuration: 650, preDelay: 150, postDelay: 1200 });

    // 6. Celebrate: Highlight created slot on grid
    console.log("-> Слот мгновенно появился в сетке расписания!");
    await page.waitForTimeout(2500);
    await smoothMouseMove(page, 960, 540, 800);
    await page.waitForTimeout(2000);

  } finally {
    const videoObj = page.video();
    await page.close();
    await context.close();
    if (videoObj) {
      const videoPath = await videoObj.path();
      const targetPath = path.join(VIDEO_DIR, "scenario1_quick_booking_3sec.webm");
      fs.copyFileSync(videoPath, targetPath);
      console.log(`✅ Сценарий 1 успешно записан: ${targetPath} (${fs.statSync(targetPath).size} bytes)`);
    }
  }
}

// -------------------------------------------------------------
// SCENARIO 2: УДАЛЕННОЕ ПОДПИСАНИЕ СМЕТЫ НА СМАРТФОНЕ (20 SEC)
// -------------------------------------------------------------
async function recordScenario2_MobileEstimateSigning(browser) {
  console.log("\n==================================================");
  console.log("🎬 Запуск Сценария 2: «Удаленное подписание сметы на смартфоне» (390x844 iPhone)");
  console.log("==================================================");

  const token = await prepareImplantEstimateToken();
  const scenarioVideoDir = path.join(VIDEO_DIR, "scenario2");
  if (!fs.existsSync(scenarioVideoDir)) fs.mkdirSync(scenarioVideoDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
    userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    recordVideo: {
      dir: scenarioVideoDir,
      size: { width: 390, height: 844 },
    },
  });

  const page = await context.newPage();
  globalMousePos = { x: 195, y: 400 };

  try {
    const targetUrl = `${BASE_URL}/#/portal/budget/${token}`;
    console.log(`-> Переход на мобильный портал сметы: ${targetUrl}`);
    await page.goto(targetUrl, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForSelector('.patient-budget-container, [data-testid="budget-verify-section"], input, #phoneDigitsInput', { timeout: 15000 });
    await injectVisualCursor(page);
    await page.waitForTimeout(1000);

    // 1. Enter 4 digits of phone number: "1234"
    console.log("-> Ввод 4 цифр номера телефона для подтверждения (1234)...");
    const numInput = page.locator('#phoneDigitsInput, input.patient-budget-verify-input, [data-testid="budget-verify-input"], input').first();

    if (await numInput.isVisible().catch(() => false)) {
      await smoothClick(page, numInput, { moveDuration: 600, preDelay: 150, postDelay: 200 });
      for (const char of ["1", "2", "3", "4"]) {
        await page.keyboard.type(char, { delay: 180 });
      }
      await page.waitForTimeout(300);

      console.log("-> Подтверждение входа в смету...");
      const verifyBtn = page.locator('button:has-text("Открыть смету"), button[data-testid="patient-budget-verify-submit-btn"], button:has-text("Войти")').first();
      await smoothClick(page, verifyBtn, { moveDuration: 500, preDelay: 120, postDelay: 1200 });
    }

    await injectVisualCursor(page);
    await page.waitForTimeout(800);

    // 2. Smoothly inspect quote details (Straumann BLX, Zirconia crown, 90 000 ₽)
    console.log("-> Плавный скролл сметы имплантации (Straumann BLX, 90 000 ₽)...");
    for (let scrollStep = 0; scrollStep < 4; scrollStep++) {
      await page.mouse.wheel(0, 150);
      await page.waitForTimeout(350);
    }

    // 3. Draw signature curve on Canvas or click 1-Click PEP stamp
    console.log("-> Сенсорное подписание сметы пальцем на экране...");
    const canvasLocator = page.locator('canvas, [data-testid="patient-budget-signature-canvas"]').first();
    const pepBtn = page.locator('button[data-testid="patient-budget-generate-pep-stamp-btn"], button:has-text("Штамп ПЭП")').first();

    if (await pepBtn.isVisible().catch(() => false)) {
      await smoothClick(page, pepBtn, { moveDuration: 600, preDelay: 150, postDelay: 400 });
    } else if (await canvasLocator.isVisible().catch(() => false)) {
      const box = await canvasLocator.boundingBox();
      if (box) {
        const startX = box.x + 30;
        const startY = box.y + box.height / 2;
        await smoothMouseMove(page, startX, startY, 400);
        await page.mouse.down();
        for (let t = 0; t <= 1; t += 0.05) {
          const cx = Math.round(startX + t * (box.width - 60));
          const cy = Math.round(startY + Math.sin(t * Math.PI * 4) * 20 - t * 10);
          await page.mouse.move(cx, cy);
          await page.waitForTimeout(20);
        }
        await page.mouse.up();
        await page.waitForTimeout(400);
      }
    }

    // 4. Click Sign CTA: «Подписать и согласовать смету» / «Согласовать смету»
    console.log("-> Клик по кнопке «Подписать и согласовать смету»...");
    const signCta = page.locator('button:has-text("Подписать и согласовать"), button[data-testid="patient-budget-agree-oneclick-btn"], button:has-text("Согласовать")').first();
    if (await signCta.isVisible().catch(() => false)) {
      await smoothClick(page, signCta, { moveDuration: 600, preDelay: 180, postDelay: 1500 });
    }

    // 5. Success screen: Green checkmark and official signed badge
    console.log("-> Успех: смета в статусе «Согласовано»!");
    await page.waitForSelector('.patient-budget-accepted-card, :has-text("Смета успешно согласована"), :has-text("Согласовано")', { timeout: 8000 }).catch(() => {});
    await page.waitForTimeout(2500);

  } finally {
    const videoObj = page.video();
    await page.close();
    await context.close();
    if (videoObj) {
      const videoPath = await videoObj.path();
      const targetPath = path.join(VIDEO_DIR, "scenario2_mobile_estimate_signing.webm");
      fs.copyFileSync(videoPath, targetPath);
      console.log(`✅ Сценарий 2 успешно записан: ${targetPath} (${fs.statSync(targetPath).size} bytes)`);
    }
  }
}

// -------------------------------------------------------------
// SCENARIO 3: ВЫПИСКА РЕЦЕПТА У КРЕСЛА В 1 КЛИК (15 SEC)
// -------------------------------------------------------------
async function recordScenario3_ChairsidePrescription(browser, auth) {
  console.log("\n==================================================");
  console.log("🎬 Запуск Сценария 3: «Выписка рецепта у кресла в 1 клик» (Desktop 1920x1080)");
  console.log("==================================================");

  const scenarioVideoDir = path.join(VIDEO_DIR, "scenario3");
  if (!fs.existsSync(scenarioVideoDir)) fs.mkdirSync(scenarioVideoDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: scenarioVideoDir,
      size: { width: 1920, height: 1080 },
    },
  });

  await context.addInitScript(({ cTok, sTok, oId, uName }) => {
    localStorage.setItem("dente_clinic_token", cTok);
    localStorage.setItem("dente_staff_token", sTok);
    localStorage.setItem("dente_active_session_token", sTok);
    localStorage.setItem("dente_organization_id", oId);
    localStorage.setItem("dente_user_role", "doctor");
    localStorage.setItem("dente_role", "doctor");
    localStorage.setItem("dente_perspective", "doctor");
    localStorage.setItem("dente_user_name", uName);
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_onboarding_dismissed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1, selectedWorkspaceRole: "doctor" }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_demo_showcase", "true");
  }, { cTok: auth.clinicToken, sTok: auth.staffToken, oId: auth.organizationId, uName: auth.userName });

  const page = await context.newPage();
  globalMousePos = { x: 960, y: 300 };

  try {
    await page.goto(`${BASE_URL}/?demo=true#visit`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2000);
    await injectVisualCursor(page);

    // If queue cockpit, click patient card to enter visit
    const isQueue = await page.evaluate(() => {
      return Boolean(document.querySelector(".intake-cockpit, [data-testid='intake-cockpit']"));
    });

    if (isQueue) {
      console.log("-> Обнаружена очередь приёма, выбор пациента...");
      const patientCard = page.locator("button:has-text('Начать приём'), .patient-queue-card, [data-patient-id]").first();
      if (await patientCard.isVisible().catch(() => false)) {
        await smoothClick(page, patientCard, { moveDuration: 600, preDelay: 100, postDelay: 1200 });
      }
    }

    // Switch to Odontogram / Diary subtab
    const odontoTab = page.locator("[data-testid='visit-subtab-odontogram']").first();
    if (await odontoTab.isVisible().catch(() => false)) {
      await smoothClick(page, odontoTab, { moveDuration: 550, preDelay: 100, postDelay: 800 });
    }

    // Open Visit Diary "..." more actions menu
    console.log("-> Открытие меню дополнительных действий дневника...");
    const moreActionsBtn = page.locator("[data-testid='diary-more-actions-btn']").first();
    if (await moreActionsBtn.isVisible().catch(() => false)) {
      await smoothClick(page, moreActionsBtn, { moveDuration: 500, preDelay: 100, postDelay: 400 });
    }

    // Click "Рецепт на лекарства"
    console.log("-> Открытие рецептурного модуля Минздрава РФ (Приказ 1094н)...");
    const openRxBtn = page.locator("[data-testid='open-prescription-btn']").first();
    if (await openRxBtn.isVisible().catch(() => false)) {
      await smoothClick(page, openRxBtn, { moveDuration: 500, preDelay: 100, postDelay: 600 });
    } else {
      await page.evaluate(() => {
        const btn = document.querySelector("[data-testid='diary-more-actions-btn']");
        if (btn) btn.click();
      });
      await page.waitForTimeout(350);
      await page.evaluate(() => {
        const rx = document.querySelector("[data-testid='open-prescription-btn']");
        if (rx) rx.click();
      });
    }

    // Wait for prescription modal
    await page.waitForSelector("[data-testid='prescription-print-modal']", { timeout: 15000 });
    await injectVisualCursor(page);
    await page.waitForTimeout(800);

    // 1-Click Fast Preset: «После удаления зуба» / «Комплект после удаления/имплантации»
    console.log("-> 1-клик выбор комплекта: Амоксиклав + Нимесил + Хлоргексидин...");
    const presetBtn = page.locator('button:has-text("Печать"), button:has-text("В дневник")').first();
    if (await presetBtn.isVisible().catch(() => false)) {
      await smoothClick(page, presetBtn, { moveDuration: 650, preDelay: 150, postDelay: 600 });
    }

    // Inspect statutory preview: Order 1094n Form 107-1/u
    console.log("-> Показ официального рецептурного бланка с печатями...");
    await smoothMouseMove(page, 1300, 500, 800);
    await page.waitForTimeout(2500);

  } finally {
    const videoObj = page.video();
    await page.close();
    await context.close();
    if (videoObj) {
      const videoPath = await videoObj.path();
      const targetPath = path.join(VIDEO_DIR, "scenario3_chairside_prescription_1click.webm");
      fs.copyFileSync(videoPath, targetPath);
      console.log(`✅ Сценарий 3 успешно записан: ${targetPath} (${fs.statSync(targetPath).size} bytes)`);
    }
  }
}

// -------------------------------------------------------------
// SCENARIO 4: ОПЕРАТИВНАЯ ШТОРКА COPILOT (ЗАДАЧИ СМЕНЫ) (20 SEC)
// -------------------------------------------------------------
async function recordScenario4_CopilotTasksDrawer(browser, auth) {
  console.log("\n==================================================");
  console.log("🎬 Запуск Сценария 4: «Оперативная шторка Copilot (To do)» (Desktop 1920x1080)");
  console.log("==================================================");

  const scenarioVideoDir = path.join(VIDEO_DIR, "scenario4");
  if (!fs.existsSync(scenarioVideoDir)) fs.mkdirSync(scenarioVideoDir, { recursive: true });

  const context = await browser.newContext({
    viewport: { width: 1920, height: 1080 },
    recordVideo: {
      dir: scenarioVideoDir,
      size: { width: 1920, height: 1080 },
    },
  });

  await context.addInitScript(({ cTok, sTok, oId, uName }) => {
    localStorage.setItem("dente_clinic_token", cTok);
    localStorage.setItem("dente_staff_token", sTok);
    localStorage.setItem("dente_active_session_token", sTok);
    localStorage.setItem("dente_organization_id", oId);
    localStorage.setItem("dente_user_role", "doctor");
    localStorage.setItem("dente_role", "doctor");
    localStorage.setItem("dente_perspective", "doctor");
    localStorage.setItem("dente_user_name", uName);
    localStorage.setItem("dente_onboarding_completed", "true");
    localStorage.setItem("dente_onboarding_dismissed", "true");
    localStorage.setItem("dental-crm:onboarding:v1", JSON.stringify({ dismissed: true, step: "done" }));
    localStorage.setItem("dente_ui_preferences_v1", JSON.stringify({ onboardingDismissed: true, version: 1, selectedWorkspaceRole: "doctor" }));
    localStorage.setItem("dente_tour_completed", "true");
    localStorage.setItem("dente_quest_progress_v2", JSON.stringify({ isDismissedPermanently: true, activeTrack: null, tracksProgress: {} }));
    localStorage.setItem("dente_theme", "light");
    localStorage.setItem("dente_theme_mode", "light");
    localStorage.setItem("dente_demo_showcase", "true");
  }, { cTok: auth.clinicToken, sTok: auth.staffToken, oId: auth.organizationId, uName: auth.userName });

  const page = await context.newPage();
  globalMousePos = { x: 500, y: 150 };

  try {
    await page.goto(`${BASE_URL}/?demo=true#shift`, { waitUntil: "domcontentloaded", timeout: 45000 });
    await page.waitForTimeout(2000);
    await injectVisualCursor(page);

    // 1. Click topbar Copilot Assistant button (#topbar-copilot-btn)
    console.log("-> Клик по кнопке ИИ-ассистента ДЕНТА в шапке клиники...");
    const copilotBtn = page.locator('#topbar-copilot-btn, [data-testid="topbar-copilot-btn"]').first();
    await smoothClick(page, copilotBtn, { moveDuration: 750, preDelay: 200, postDelay: 800 });

    // 2. Wait for CopilotDrawer to slide in
    await page.waitForSelector('.copilot-drawer.open, aside[aria-label*="ассистент"]', { timeout: 10000 });
    await injectVisualCursor(page);
    await page.waitForTimeout(600);

    // 3. Switch to «Задачи» tab
    console.log("-> Переключение на вкладку оперативных задач смены...");
    const tasksTabBtn = page.locator('.copilot-tab-btn:has-text("Задачи")').first();
    if (await tasksTabBtn.isVisible().catch(() => false)) {
      await smoothClick(page, tasksTabBtn, { moveDuration: 550, preDelay: 120, postDelay: 600 });
    }

    // 4. Hover and inspect shift debts (Recalls & Pending Estimates)
    console.log("-> Показ оперативной сводки: просроченные рекаллы и зависшие сметы...");
    await smoothMouseMove(page, 1650, 320, 700);
    await page.waitForTimeout(1000);

    // 5. 1-Click WhatsApp / Call Action
    console.log("-> 1-клик напоминание в WhatsApp по смете на имплантацию...");
    const actionBtn = page.locator('.copilot-tasks-section button, button:has-text("WhatsApp"), button:has-text("Позвонить"), [data-testid*="task-action-"]').first();
    if (await actionBtn.isVisible().catch(() => false)) {
      await smoothClick(page, actionBtn, { moveDuration: 600, preDelay: 150, postDelay: 1200 });
    }

    console.log("-> Мгновенный отклик и фиксация результата!");
    await page.waitForTimeout(2500);

  } finally {
    const videoObj = page.video();
    await page.close();
    await context.close();
    if (videoObj) {
      const videoPath = await videoObj.path();
      const targetPath = path.join(VIDEO_DIR, "scenario4_copilot_tasks_drawer.webm");
      fs.copyFileSync(videoPath, targetPath);
      console.log(`✅ Сценарий 4 успешно записан: ${targetPath} (${fs.statSync(targetPath).size} bytes)`);
    }
  }
}

// -------------------------------------------------------------
// MAIN ENTRY POINT
// -------------------------------------------------------------
async function runAll() {
  ensureDirs();
  console.log("🚀 Starting Inquisitor GTM Video Demo Recorder Harness...");

  const auth = await obtainShowcaseAuthTokens();

  const chromePath = "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await chromium.launch({
    headless: true,
    executablePath: fs.existsSync(chromePath) ? chromePath : undefined,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--mute-audio",
    ],
  });

  const arg = process.argv[2];
  try {
    if (!arg || arg === "all" || arg === "1") {
      await recordScenario1_ScheduleQuickBooking(browser, auth);
    }
    if (!arg || arg === "all" || arg === "2") {
      await recordScenario2_MobileEstimateSigning(browser);
    }
    if (!arg || arg === "all" || arg === "3") {
      await recordScenario3_ChairsidePrescription(browser, auth);
    }
    if (!arg || arg === "all" || arg === "4") {
      await recordScenario4_CopilotTasksDrawer(browser, auth);
    }

    console.log("\n🎉 GTM DEMO VIDEOS RECORDED SUCCESSFULLY!");
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  runAll().catch((err) => {
    console.error("FATAL ERROR IN GTM DEMO RECORDER:", err);
    process.exit(1);
  });
}

module.exports = {
  runAll,
  recordScenario1_ScheduleQuickBooking,
  recordScenario2_MobileEstimateSigning,
  recordScenario3_ChairsidePrescription,
  recordScenario4_CopilotTasksDrawer,
};
