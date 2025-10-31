import { App } from "@slack/bolt";
import dotenv from "dotenv";

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret:
    process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const scores = {}; // simple in-memory storage

app.event(
  "message",
  async ({ event, client }) => {
    if (event.subtype === "bot_message")
      return;

    const text = event.text ?? "";
    const match = text.match(
      /<@(\w+)>.*\b(daily|retro|planning)\b/i
    );

    if (match) {
      const userId = event.user;

      scores[userId] =
        (scores[userId] || 0) + 1;

      await client.chat.postMessage({
        channel: event.channel,
        text: `Dziękujemy za donos. Masz już ${scores[userId]} punktów na swoim koncie.`,
      });
    }
  }
);

(async () => {
  await app.start();
  console.log(
    "⚡️ DailyRanker app is running!"
  );
})();
