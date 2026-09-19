// report.js - Telegram Messaging & Execution Reporting Module

export async function sendTelegram(text) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;

  if (!token || !chatId || token.includes("YOUR_")) {
    console.warn("⚠️ [REPORT] Telegram credentials missing or default placeholder.");
    return false;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML"
      })
    });

    if (!response.ok) {
      throw new Error(`Telegram API returned status ${response.status}`);
    }

    console.log("📨 [REPORT] Telegram notification dispatched successfully.");
    return true;
  } catch (err) {
    console.error("❌ [REPORT ERROR]:", err.message);
    return false;
  }
}

export async function sendStageReport({
  stageName,
  claimed = false,
  initialBalance = 0,
  reinvested = 0,
  finalBalance = 0
}) {
  const claimStatus = claimed ? "✅ Claimed" : "ℹ️ No Claim Available";
  
  let message = `🤖 <b>ZenQuant Stage Report: ${stageName}</b>\n\n`;
  message += `🎁 <b>Settlement Status:</b> ${claimStatus}\n`;
  message += `💵 <b>Starting Balance:</b> $${initialBalance.toFixed(2)}\n`;
  message += `⚡ <b>Amount Reinvested:</b> $${reinvested} USD\n`;
  message += `💰 <b>Remaining Unused:</b> $${finalBalance.toFixed(2)}\n\n`;
  message += `STATUS: <b>SUCCESS ✅</b>`;

  return await sendTelegram(message);
}

export async function sendErrorReport(stageName, errorMessage) {
  const message = `🚨 <b>ZenQuant Error Alert</b>\n\n` +
                  `📍 <b>Stage:</b> ${stageName}\n` +
                  `❌ <b>Error:</b> ${errorMessage}`;

  return await sendTelegram(message);
}
