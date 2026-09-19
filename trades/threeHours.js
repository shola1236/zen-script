// trade/threeHours.js - Standard 3Hours Strategy Execution Module

import puppeteer from "puppeteer";
import { loginAndNavigateToTrade, safeClick } from "../login.js";
import { sendStageReport, sendErrorReport } from "../report.js";

export async function startThreeHoursTask(delayMinutes = 30) {
  const stageName = "3Hours Standard";
  const delayMs = delayMinutes * 60 * 1000;
  const STEEL_API_KEY = process.env.STEEL_API_KEY;

  if (!STEEL_API_KEY) {
    console.error("❌ [3HOURS TRADE] STEEL_API_KEY missing.");
    return;
  }

  console.log(`\n⏳ [3HOURS TIMER] Initiating ${delayMinutes}-minute delay...`);
  await new Promise((res) => setTimeout(res, delayMs));

  let browser = null;
  let page = null;
  let claimed = false;

  try {
    console.log("\n==================================================");
    console.log("🚀 [3HOURS TRADE] Delay expired! Connecting to Steel.dev browser...");
    console.log("==================================================");

    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}`
    });

    page = await loginAndNavigateToTrade(browser);

    // 1. Universal Settlement Claim
    console.log("💰 [3HOURS TRADE] Checking for active settlements...");
    const settlementHandle = await page.$('.uit-order-lists__receive-btn-text') ||
                             await page.$('.trade-pos__claim') ||
                             await page.$('.uit-order-lists__receive-btn');

    if (settlementHandle) {
      console.log("🎯 [3HOURS TRADE] Settlement button detected! Tapping...");
      await safeClick(page, settlementHandle);
      await new Promise((res) => setTimeout(res, 1500));

      const confirmBtnHandle = await page.$('.btnConfirm');       if (confirmBtnHandle) {         await safeClick(page, confirmBtnHandle);         claimed = true;         console.log("✅ [3HOURS TRADE] Settlement modal confirmed!");       } else {         const fallbackConfirmed = await page.evaluate(() => {           const btn = document.querySelector('.btnConfirm') \vert{}\vert{}                        Array.from(document.querySelectorAll("uni-view")).find(                         (el) => el.classList.contains("btnConfirm") \vert{}\vert{} (el.innerText && el.innerText.trim().toUpperCase() === "CONFIRM")                       );           if (btn) {             ["pointerdown", "touchstart", "mousedown", "pointerup", "touchend", "mouseup", "click"].forEach((evt) => {               btn.dispatchEvent(new Event(evt, { bubbles: true, cancelable: true }));             });             return true;           }           return false;         });          if (fallbackConfirmed) {           claimed = true;           console.log("✅ [3HOURS TRADE] Modal confirmed via inner tree fallback!");         }       }        console.log("⏳ [3HOURS TRADE] Waiting 5 seconds for balance refresh...");       await new Promise((res) => setTimeout(res, 5000));     } else {       console.log("ℹ️ [3HOURS TRADE] No active settlement ready to claim.");     }      // 2. Strategy Selection ("3Hours" Standard Tab)     console.log("🎯 [3HOURS TRADE] Verifying 3Hours strategy tab...");     const durationTabs = await page.$$('.trade-dur');
    for (const tab of durationTabs) {
      const text = await page.evaluate((el) => el.innerText.trim(), tab);
      if (text.toUpperCase().includes("3") && !text.toUpperCase().includes("PLUS")) {
        const isActive = await page.evaluate((el) => {
          const bg = window.getComputedStyle(el).backgroundColor;
          return el.classList.contains('trade-dur--on') || 
                 el.classList.contains('active') || 
                 (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent');
        }, tab);

        if (!isActive) {
          console.log("🔄 [3HOURS TRADE] Tapping 3Hours tab...");
          await safeClick(page, tab);
          await new Promise((res) => setTimeout(res, 1000));
        }
        break;
      }
    }

    // 3. Read Remaining Balance & Reinvest (100% Uncapped Balance)
    console.log("💵 [3HOURS TRADE] Reading updated Available Balance...");
    const rawBalance = await page.evaluate(() => {
      const balanceNode = document.querySelector('.trade-inject-balance__num');
      return balanceNode ? parseFloat(balanceNode.innerText.trim()) : 0;
    });

    const amountToInject = Math.floor(rawBalance);
    let reinvestedAmount = 0;

    if (amountToInject > 0) {
      console.log(`🚀 [3HOURS TRADE] Preparing to inject ${amountToInject} USD...`);
      const numberInputHandle = await page.$('input.uni-input-input');

      if (numberInputHandle) {
        await numberInputHandle.click({ clickCount: 3 });
        await numberInputHandle.type(amountToInject.toString(), { delay: 100 });
        await page.evaluate((el) => {
          el.dispatchEvent(new Event("input", { bubbles: true }));
          el.dispatchEvent(new Event("change", { bubbles: true }));
        }, numberInputHandle);
      } else {
        throw new Error("Injection input field not found.");
      }

      await new Promise((res) => setTimeout(res, 1200));

      const confirmHandle = await page.$('uni-button.trade-submit');
      if (confirmHandle) {
        await safeClick(page, confirmHandle);
        reinvestedAmount = amountToInject;
        console.log(`🎉 [3HOURS TRADE SUCCESS] Successfully injected ${amountToInject} USD!`);
        await new Promise((res) => setTimeout(res, 15000));
      } else {
        throw new Error("Confirm Injection button ('uni-button.trade-submit') not found in DOM.");
      }
    } else {
      console.log("⚠️ [3HOURS TRADE] Available balance is 0 USD or insufficient.");
    }

    // 4. Final Balance & Report Dispatch
    const finalBalance = await page.evaluate(() => {
      const balanceNode = document.querySelector('.trade-inject-balance__num');
      return balanceNode ? parseFloat(balanceNode.innerText.trim()) : 0;
    });

    await sendStageReport({
      stageName,
      claimed,
      initialBalance: rawBalance,
      reinvested: reinvestedAmount,
      finalBalance
    });

  } catch (err) {
    console.error(`❌ [3HOURS TRADE ERROR]:`, err.message);
    await sendErrorReport(stageName, err.message);
  } finally {
    if (browser) {
      await browser.disconnect();
      console.log("🔒 [3HOURS TRADE] Disconnected cleanly.\n");
    }
  }
}
