import serverless from "serverless-http";
import express from "express";
import bodyParser from "body-parser";
import {
  App,
  ExpressReceiver,
} from "@slack/bolt";
import {
  addPoints,
  getAllUserPoints,
} from "../../fb.js";
import { ENV_VALUES } from "../../config.js";

// --- Create a custom receiver that disables body parsing ---
const expressApp = express();

expressApp.use(
  express.raw({ type: "*/*" }) // keep body raw for Slack signature verification
);

const receiver = new ExpressReceiver({
  signingSecret:
    ENV_VALUES.SLACK_SIGNING_SECRET,
  processBeforeResponse: true,
  app: expressApp,
});

const slackClient = new App({
  token: ENV_VALUES.SLACK_BOT_TOKEN,
  receiver,
});

// --- SLACK EVENTS ---
slackClient.event(
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
    if (!match) return;

    const userId = event.user;
    const isSelfSnitching =
      match[1] === userId;
    const newPoints = isSelfSnitching
      ? 10
      : 5;
    const updatedPoints =
      await addPoints(
        userId,
        newPoints
      );

    await client.chat.postMessage({
      channel: event.channel,
      text: `${
        isSelfSnitching
          ? "Gratulacje! Samopodpierdolka jest podwójnie punktowana"
          : "Dziękujemy za donos"
      }. Masz już ${updatedPoints} punktów na swoim koncie.`,
    });
  }
);

// --- SLASH COMMAND ---
slackClient.command(
  "/podpierdolki",
  async ({ ack, say }) => {
    console.log(
      "⚡ Slash command triggered"
    );
    await ack();

    const points =
      await getAllUserPoints();
    if (!points.length) {
      await say(
        "Nie znaleziono donosów :("
      );
      return;
    }

    const sortedPoints = points.sort(
      (a, b) => b.points - a.points
    );
    const text = sortedPoints
      .slice(0, 3)
      .map(
        (user, index) =>
          `${index + 1}. <@${
            user.id
          }> — *${user.points}* punktów`
      )
      .join("\n");

    await say({
      text: `*Ranking donosicieli:*\n${text}`,
    });
  }
);

// --- Express endpoints ---
expressApp.post(
  "/.netlify/functions/app",
  (req, res, next) => {
    // Slack URL verification
    if (
      req.body?.type ===
      "url_verification"
    ) {
      const challenge = JSON.parse(
        req.body.toString()
      ).challenge;
      console.log(
        "✅ Responding with challenge:",
        challenge
      );
      return res
        .status(200)
        .json({ challenge });
    }

    console.log(
      "⚙️ Passing to Slack Bolt app"
    );
    return receiver.app(req, res, next);
  }
);

// Mount Bolt internal app
expressApp.use(
  "/.netlify/functions/app",
  receiver.app
);

// Export Netlify handler
export const handler =
  serverless(expressApp);
