// login.js - Authentication, Keep-Alive, & Uni-App Event Utility Module

import http from "http";

const PORT = process.env.PORT || 3000;
const RENDER_URL = process.env.RENDER_EXTERNAL_URL;

http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("ZenQuant Automation Bot Active\n");
}).listen(PORT, () => {
  console.log(`🌐 [KEEP-ALIVE] HTTP server listening on port ${PORT}`);
});

if (RENDER_URL) {
  console.log(`📡 [KEEP-ALIVE] Self-ping service activated for: ${RENDER_URL}`);
  setInterval(async () => {
    try {
      await fetch(RENDER_URL);
      console.log("⏰ [KEEP-ALIVE] Self-ping dispatched successfully.");
    } catch (err) {
      console.error("⚠️ [KEEP-ALIVE ERROR] Self-ping failed:", err.message);
    }
  }, 10 * 60 * 1000); 
}

export async function safeClick(page, elementHandle) {
  if (!elementHandle) return false;
  try {
    await elementHandle.evaluate((el) => {
      ["pointerdown", "touchstart", "mousedown", "pointerup", "touchend", "mouseup", "click"].forEach((evt) => {
        el.dispatchEvent(new Event(evt, { bubbles: true, cancelable: true }));
      });
    });
    return true;
  } catch (_) {
    return false;
  }
}

export async function loginAndNavigateToTrade(browser) {
  const ZEN_PHONE = process.env.ZENQUANT_PHONE;
  const ZEN_PASSWORD = process.env.ZENQUANT_PASSWORD;
  const BASE_URL = process.env.BASE_URL || "https://zenquantai.com";

  if (!ZEN_PHONE || !ZEN_PASSWORD) {
    throw new Error("Missing ZENQUANT_PHONE or ZENQUANT_PASSWORD in environment variables.");
  }

  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });

  console.log("🔑 [LOGIN] Navigating to Login Page...");
  await page.goto(`${BASE_URL}/#/pages/login/login`, {
    waitUntil: "domcontentloaded",
    timeout: 45000
  });

  console.log("⏳ [LOGIN] Waiting for Uni-App inputs to mount...");
  await page.waitForSelector("input.uni-input-input", { timeout: 30000 });
  await new Promise((res) => setTimeout(res, 2500));

  console.log("🌍 [LOGIN] Checking country prefix list...");
  await page.evaluate(() => {
    const countryRows = Array.from(document.querySelectorAll(".country-list-row"));
    const nigeriaRow = countryRows.find((el) => el.innerText && (el.innerText.includes("Nigeria") || el.innerText.includes("+234")));
    if (nigeriaRow) nigeriaRow.click();
  });
  await new Promise((res) => setTimeout(res, 800));

  console.log("🎯 [LOGIN] Locating input fields and entering credentials...");
  const phoneInputHandle = await page.$('input.uni-input-input[type="number"]');
  const passInputHandle = await page.$('input.uni-input-input[type="password"]');

  if (!phoneInputHandle || !passInputHandle) {
    throw new Error("Target login input elements missing from DOM.");
  }

  await phoneInputHandle.click({ clickCount: 3 });
  await phoneInputHandle.type(ZEN_PHONE, { delay: 50 });
  await page.evaluate((el) => {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, phoneInputHandle);

  await new Promise((res) => setTimeout(res, 500));

  await passInputHandle.click({ clickCount: 3 });
  await passInputHandle.type(ZEN_PASSWORD, { delay: 50 });
  await page.evaluate((el) => {
    el.dispatchEvent(new Event("input", { bubbles: true }));
    el.dispatchEvent(new Event("change", { bubbles: true }));
  }, passInputHandle);

  await new Promise((res) => setTimeout(res, 1000));

  console.log("👆 [LOGIN] Submitting login form...");
  const loginCtaHandle = await page.$('.zq-cta');

  if (loginCtaHandle) {
    await safeClick(page, loginCtaHandle);
  } else {
    const fallbackBtn = await page.evaluateHandle(() => {
      return Array.from(document.querySelectorAll("uni-view, uni-button, button")).find(
        (el) => el.innerText && el.innerText.trim().toUpperCase() === "LOGIN"
      );
    });
    const el = await fallbackBtn.asElement();
    if (el) await safeClick(page, el);
  }

  await new Promise((res) => setTimeout(res, 7000));

  const currentUrl = page.url();
  if (currentUrl.includes("login")) {
    throw new Error("Login failed. Navigation stayed on login route post-submit.");
  }

  console.log("✅ [LOGIN SUCCESS] Navigating to Trade page...");
  await page.goto(`${BASE_URL}/#/pages/UITransaction/trade`, {
    waitUntil: "domcontentloaded",
    timeout: 35000
  });

  await new Promise((res) => setTimeout(res, 5000));
  return page;
}
