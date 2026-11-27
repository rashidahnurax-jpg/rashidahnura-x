import fs from "node:fs";
import puppeteer from "puppeteer-core";

const OUT = "test-artifacts";
fs.mkdirSync(`${OUT}/downloads`, { recursive: true });
fs.mkdirSync(`${OUT}/flagship`, { recursive: true });
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const BASE = "http://localhost:3000";
const slug = "intentional-intelligence";

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage", "--hide-scrollbars"],
});

const errors = [];
try {
  const page = await browser.newPage();
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(msg.text());
  });
  page.on("pageerror", (err) => errors.push(`pageerror: ${err.message}`));
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const client = await page.target().createCDPSession();
  await client.send("Page.setDownloadBehavior", { behavior: "allow", downloadPath: `${process.cwd()}/${OUT}/downloads` });

  await page.goto(`${BASE}/g/${slug}`, { waitUntil: "networkidle0", timeout: 120000 });
  await new Promise((r) => setTimeout(r, 1500));
  await page.screenshot({ path: `${OUT}/flagship/mobile-top.png` });

  const banner = await page.evaluate(() => {
    const img = document.querySelector('img[src="/brand/banner.jpg"]');
    if (!img) return null;
    const rect = img.getBoundingClientRect();
    return { natural: [img.naturalWidth, img.naturalHeight], rendered: [rect.width, rect.height], ratio: rect.height / rect.width };
  });
  console.log("banner", banner);

  const hearts = await page.$$("button[aria-pressed]");
  console.log("heart buttons", hearts.length);
  if (hearts[0]) await hearts[0].click();
  await new Promise((r) => setTimeout(r, 300));
  const hearts2 = await page.$$("button[aria-pressed]");
  if (hearts2[1]) await hearts2[1].click();
  await new Promise((r) => setTimeout(r, 600));
  const trayText = await page.evaluate(() => {
    const el = document.querySelector(".fixed.inset-x-0.bottom-0");
    return el ? el.textContent : null;
  });
  console.log("tray", JSON.stringify(trayText));
  await page.screenshot({ path: `${OUT}/flagship/mobile-selection.png` });

  const zip = await page.$("button::-p-text(Download ZIP)");
  if (zip) {
    await zip.click();
    await new Promise((r) => setTimeout(r, 2500));
  }
  console.log("downloads", fs.readdirSync(`${OUT}/downloads`));

  const openers = await page.$$("button[aria-label^='Open ']");
  if (openers[0]) {
    await openers[0].click();
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: `${OUT}/flagship/mobile-lightbox.png` });
    await page.keyboard.press("ArrowRight");
    await new Promise((r) => setTimeout(r, 900));
    const counter = await page.evaluate(() => {
      const el = document.querySelector('[role="dialog"][aria-modal="true"]');
      return el?.textContent?.slice(0, 80) ?? null;
    });
    console.log("lightbox", JSON.stringify(counter));
    await page.keyboard.press("Escape");
    await new Promise((r) => setTimeout(r, 400));
  }

  await page.evaluate(() => document.getElementById("gallery")?.scrollIntoView());
  await new Promise((r) => setTimeout(r, 1000));
  await page.screenshot({ path: `${OUT}/flagship/mobile-gallery.png` });

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise((r) => setTimeout(r, 1200));
  await page.screenshot({ path: `${OUT}/flagship/mobile-bottom.png` });

  const desktop = await browser.newPage();
  desktop.on("pageerror", (err) => errors.push(`desktop pageerror: ${err.message}`));
  await desktop.setViewport({ width: 1440, height: 960, deviceScaleFactor: 1 });
  await desktop.goto(`${BASE}/g/${slug}`, { waitUntil: "networkidle0", timeout: 120000 });
  await new Promise((r) => setTimeout(r, 1200));
  await desktop.screenshot({ path: `${OUT}/flagship/desktop-top.png` });
  await desktop.evaluate(() => window.scrollTo(0, 900));
  await new Promise((r) => setTimeout(r, 900));
  await desktop.screenshot({ path: `${OUT}/flagship/desktop-gallery.png` });

  console.log("console errors", errors);
} finally {
  await browser.close();
}
