const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const outDir = path.join(__dirname, 'audit_screenshots');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir, { recursive: true });
}

async function clickByText(page, textMatches) {
  const elements = await page.$$('button, a, div');
  for (let el of elements) {
    const text = await page.evaluate(e => e.textContent, el);
    if (text && textMatches.some(match => text.toLowerCase().includes(match.toLowerCase()))) {
      await el.click();
      return true;
    }
  }
  return false;
}

async function run() {
  console.log("Starting Advanced E2E Audit with Tour and PDF generation...");
  const browser = await puppeteer.launch({
    headless: "new",
    defaultViewport: { width: 1440, height: 900 }
  });

  const page = await browser.newPage();
  const url = 'http://127.0.0.1:5173';

  const downloadPath = path.resolve(__dirname, 'downloads');
  if (!fs.existsSync(downloadPath)) fs.mkdirSync(downloadPath);
  const client = await page.target().createCDPSession();
  await client.send('Page.setDownloadBehavior', {
    behavior: 'allow',
    downloadPath: downloadPath
  });

  console.log(`Navigating to ${url}...`);
  try {
    await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
  } catch (e) {
    console.log("Failed to load page");
    throw e;
  }

  const takeScreenshot = async (name) => {
    await new Promise(r => setTimeout(r, 1000));
    await page.screenshot({ path: path.join(outDir, `${name}.png`), fullPage: true });
  };

  // 1. Имитация прохождения интерактивного тура
  console.log("Checking Interactive Tour...");
  try {
    const clickedNext = await clickByText(page, ['Далее', 'Next', 'Начать тур']);
    if (clickedNext) {
      console.log("Found interactive tour, clicking through...");
      await takeScreenshot('tour_step_2');
      await clickByText(page, ['Завершить', 'Finish', 'Закрыть']);
      await takeScreenshot('tour_finished');
    } else {
      console.log("No tour visible, skipping...");
    }
  } catch (e) {
    console.log("Tour check error:", e.message);
  }

  // 2. Проверка адаптивности КТ-вьюера (Полный экран)
  console.log("Checking CT Viewer fullscreen adaptability...");
  try {
    await clickByText(page, ['Снимки']);
    await new Promise(r => setTimeout(r, 1500));
    
    // Find fullscreen button by aria-label or specific class if we know it
    const fullscreenClicked = await clickByText(page, ['На весь экран', 'Fullscreen', 'Развернуть']);
    if (fullscreenClicked) {
      await takeScreenshot('ct_viewer_fullscreen');
      await page.keyboard.press('Escape');
      await takeScreenshot('ct_viewer_restored');
    }
  } catch (e) {
    console.log("CT Viewer check error:", e.message);
  }

  // 3. Генерация PDF-отчета и проверка создания файла
  console.log("Testing PDF Generation...");
  try {
    await clickByText(page, ['Документы']);
    await new Promise(r => setTimeout(r, 1500));
    
    const pdfClicked = await clickByText(page, ['Экспорт в PDF', 'Скачать PDF', 'Сформировать отчет', 'PDF']);
    if (pdfClicked) {
      console.log("Clicked PDF export, waiting for download...");
      await new Promise(r => setTimeout(r, 4000));
      
      const files = fs.readdirSync(downloadPath);
      if (files.some(f => f.endsWith('.pdf'))) {
        console.log(`SUCCESS: PDF file found in ${downloadPath}!`);
        fs.writeFileSync(path.join(outDir, 'pdf_audit_log.txt'), 'SUCCESS: PDF Generated and downloaded physically to disk.');
      } else {
        console.log("WARNING: PDF file not found after clicking export.");
        fs.writeFileSync(path.join(outDir, 'pdf_audit_log.txt'), 'FAILED: PDF not found.');
      }
    } else {
      console.log("No PDF button found");
    }
  } catch (e) {
    console.log("PDF Generation check error:", e.message);
  }

  await browser.close();
  console.log("Advanced Audit complete.");
}

run().catch(console.error);
