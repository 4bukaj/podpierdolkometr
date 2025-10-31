import dotenv from "dotenv";
import { App } from "@slack/bolt";
import { Client } from "pg";

dotenv.config();

const port = process.env.PORT || 3000;

const db = new Client({
  connectionString:
    process.env.DATABASE_URL,
});

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret:
    process.env.SLACK_SIGNING_SECRET,
});

await db.connect();

await db.query(`
    CREATE TABLE IF NOT EXISTS scores (
      "user" TEXT PRIMARY KEY,
      score INT DEFAULT 0
    )
  `);

app.event(
  "message",
  async ({ event, client }) => {
    if (event.subtype === "bot_message")
      return;

    const text = (
      event.text ?? ""
    ).trim();
    const match = text.match(
      /<@(\w+)>.*\b(daily|retro|planning)\b/i
    );

    if (match) {
      const userId = event.user;
      console.log(match);
      const addPoints =
        `<@${userId}>` === match[0]
          ? 10
          : 5;

      await db.query(
        `
        INSERT INTO scores ("user", score)
        VALUES ($1, ${addPoints})
        ON CONFLICT ("user")
        DO UPDATE SET score = scores.score + ${addPoints}
      `,
        [userId]
      );

      const res = await db.query(
        `SELECT score FROM scores WHERE "user" = $1`,
        [userId]
      );
      const score =
        res.rows[0]?.score || 0;

      await client.chat.postMessage({
        channel: event.channel,
        text: `Dziękujemy za donos. Masz już ${score} punktów na swoim koncie.`,
      });
    }
  }
);

app.command(
  "/points",
  async ({ ack, respond }) => {
    await ack();

    const result = await db.query(`
      SELECT "user", score
      FROM scores
      ORDER BY score DESC
      LIMIT 10;
    `);

    if (result.rows.length === 0) {
      await respond(
        "Brak podpierdolek :("
      );
      return;
    }

    const leaderboard = result.rows
      .map(
        (r, i) =>
          `${i + 1}. <@${r.user}> — *${
            r.score
          }* points`
      )
      .join("\n");

    await respond({
      text: `🏆 *Najlepsi donosiciele* 🏆\n${leaderboard}`,
      response_type: "in_channel",
    });
  }
);

(async () => {
  await app.start(port);
  console.log(
    "Podpierdolkometr is running!"
  );
})();
