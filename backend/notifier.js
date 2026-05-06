const axios = require('axios');

async function sendDiscordAlert(webhookUrl, embed) {
  if (!webhookUrl || webhookUrl.trim() === '') {
    return; // Skip silently if no webhook URL
  }

  try {
    await axios.post(webhookUrl, {
      embeds: [embed]
    });
  } catch (error) {
    // Silently catch errors - never crash the app
    console.error('Discord webhook failed:', error.message);
  }
}

module.exports = { sendDiscordAlert };
