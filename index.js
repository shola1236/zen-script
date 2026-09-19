// index.js - Master Execution Orchestrator

import puppeteer from "puppeteer";
import { loginAndNavigateToTrade } from "./login.js"; 
import { executePlusTrade } from "./trade/plus.js";
import { startThreeHoursTask } from "./trade/threeHours.js";
import { sendErrorReport } from "./report.js";

const STEEL_API_KEY = process.env.STEEL_API_KEY;
const THREE_HOURS_CYCLE_MS = (3 * 60 + 5) * 60 * 1000; 

async function runMasterCycle() {
  console.log("\n==================================================");
  console.log(`⏰ [MASTER CYCLE] Starting strategy execution cycle at ${new Date().toLocaleTimeString()}`);
  console.log("==================================================");

  let browser = null;

  try {
    browser = await puppeteer.connect({
      browserWSEndpoint: `wss://connect.steel.dev?apiKey=${STEEL_API_KEY}`
    });

    const page = await loginAndNavigateToTrade(browser);
    await executePlusTrade(page);

  } catch (err) {
    console.error("❌ [MASTER CYCLE ERROR]:", err.message);
    await sendErrorReport("Master Cycle Initializer", err.message);
  } finally {
    if (browser) {
      await browser.disconnect();
      console.log("🔒 [MASTER CYCLE] Plus stage browser session disconnected.");
    }
  }

  console.log("⏳ [MASTER CYCLE] Scheduling 3Hours Standard task to start in 30 minutes...");
  startThreeHoursTask(30).catch((err) => {
    console.error("❌ [3HOURS BACKGROUND TASK ERROR]:", err.message);
  });
}

runMasterCycle();

setInterval(() => {
  console.log("\n🔄 [MASTER LOOP] 3-Hour cycle interval reached. Initiating fresh cycle...");
  runMasterCycle();
}, THREE_HOURS_CYCLE_MS);
