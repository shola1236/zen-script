// trade/plus.js - Plus Strategy Execution Module

import { safeClick } from "../login.js";
import { sendStageReport, sendErrorReport } from "../report.js";

export async function executePlusTrade(page) {
  const stageName = "3Hours Plus";
  let claimed = false;

  try {
    console.log("\n==================================================");
    console.log("🚀 [PLUS TRADE] Starting Plus Trade Lifecycle...");
    console.log("==================================================");

    console.log("💰 [PLUS TRADE] Checking for active settlements...");
    const settlementHandle = await page.$('.uit-order-lists__receive-btn-text') ||
                             await page.$('.trade-pos__claim') ||
                             await page.$('.uit-order-lists__receive-btn');

    if (settlementHandle) {
      console.log("🎯 [PLUS TRADE] Active Settlement button detected! Dispatching tap...");
      await safeClick(page, settlementHandle);
      await new Promise((res) => setTimeout(res, 1500));

      console.log("🔍 [PLUS TRADE] Locating modal confirm button (.btnConfirm)...");
      const confirmBtnHandle = await page.$('.btnConfirm');        if (confirmBtnHandle) {         await safeClick(page, confirmBtnHandle);         claimed = true;         console.log("✅ [PLUS TRADE] Settlement modal confirmed!");       } else {         const fallbackConfirmed = await page.evaluate(() => {           const btn = document.querySelector('.btnConfirm') \vert{}\vert{}                        Array.from(document.querySelectorAll("uni-view")).find(                         (el) => el.classList.contains("btnConfirm") \vert{}\vert{} (el.innerText && el.innerText.trim().toUpperCase() === "CONFIRM")                       );           if (btn) {             ["pointerdown", "touchstart", "mousedown", "pointerup", "touchend", "mouseup", "click"].forEach((evt) => {               btn.dispatchEvent(new Event(evt, { bubbles: true, cancelable: true }));             });             return true;           }           return false;         });          if (fallbackConfirmed) {           claimed = true;           console.log("✅ [PLUS TRADE] Modal confirmed via inner tree fallback!");         }       }        console.log("⏳ [PLUS TRADE] Waiting 5 seconds for balance refresh post-claim...");       await new Promise((res) => setTimeout(res, 5000));     } else {       console.log("ℹ️ [PLUS TRADE] No active settlement ready to claim.");     }      console.log("⏳ [PLUS TRADE] Verifying strategy selection ('Plus')...");     const durationTabs = await page.$$('.trade-dur');
    for (const tab of durationTabs) {
      const text = await page.evaluate((el) => el.innerText.trim(), tab);
      if (text.toUpperCase() === "PLUS") {
        const isActive = await page.evaluate((el) => {
          const bg = window.getComputedStyle(el).backgroundColor;
          return el.classList.contains('trade-dur--on') || 
                 el.classList.contains('active') || 
                 (bg !== 'rgba(0, 0, 0, 0)' && bg !== 'transparent');
        }, tab);

        if (!isActive) {
          console.log("🔄 [PLUS TRADE] 'Plus' tab present but inactive. Tapping to select...");
          await safeClick(page, tab);
          await new Promise((res) => setTimeout(res, 1000));
        }
        break;
      }
    }

    console.log("💵 [PLUS TRADE] Reading updated Available Balance...");
    const rawBalance = await page.evaluate(() => {
      const balanceNode = document.querySelector('.trade-inject-balance__num');
      return balanceNode ? parseFloat(balanceNode.innerText.trim()) : 0;
    });

    let amountToInject = Math.floor(rawBalance);
    if (amountToInject > 50) amountToInject = 50;

    let reinvestedAmount = 0;

    if (amountToInject > 0) {
      console.log(`🚀 [PLUS TRADE] Preparing to inject ${amountToInject} USD...`);
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
        console.log(`🎉 [PLUS TRADE SUCCESS] Successfully injected ${amountToInject} USD!`);
        await new Promise((res) => setTimeout(res, 15000));
      } else {
        throw new Error("Confirm Injection button ('uni-button.trade-submit') not found in DOM.");
      }
    } else {
      console.log("⚠️ [PLUS TRADE] Available balance is 0 USD or insufficient.");
    }

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

    return { success: true, claimed, reinvested: reinvestedAmount, finalBalance };

  } catch (err) {
    console.error(`❌ [PLUS TRADE ERROR]:`, err.message);
    await sendErrorReport(stageName, err.message);
    return { success: false, error: err.message };
  }
}
