import dotenv from "dotenv";
import { App } from "@slack/bolt";
import { Client } from "pg";

dotenv.config();

const db = new Client({
  connectionString:
    process.env.DATABASE_URL,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret:
    process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

await db.connect();

await db.query(`
    CREATE TABLE IF NOT EXISTS scores (
      user TEXT PRIMARY KEY,
      score INT DEFAULT 0
    )
  `);

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

      await db.query(
        `
        INSERT INTO scores (user, score)
        VALUES ($1, 1)
        ON CONFLICT (user)
        DO UPDATE SET score = scores.score + 1
      `,
        [userId]
      );

      const res = await db.query(
        `SELECT daily, retro, planning FROM scores WHERE user = $1`,
        [userId]
      );
      const points = res.rows[0];

      await client.chat.postMessage({
        channel: event.channel,
        text: `Dziękujemy za donos. Masz już ${points} punktów na swoim koncie.`,
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
