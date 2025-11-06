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

const receiver = new ExpressReceiver({
  signingSecret:
    ENV_VALUES.SLACK_SIGNING_SECRET,
});

const slackClient = new App({
  token: ENV_VALUES.SLACK_BOT_TOKEN,
  receiver,
});

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

slackClient.command(
  "/podpierdolki",
  async ({ ack, say }) => {
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

const expressApp = express();

expressApp.use(bodyParser.json());
expressApp.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

expressApp.use((req, res, next) => {
  console.log(
    "📥 Incoming:",
    req.method,
    req.url,
    req.headers["content-type"]
  );
  console.log("Body:", req.body);
  next();
});

expressApp.post("/", (req, res) => {
  if (
    req.body?.type ===
    "url_verification"
  ) {
    console.log(
      "✅ Responding with challenge:",
      req.body.challenge
    );
    return res
      .status(200)
      .json({
        challenge: req.body.challenge,
      });
  }

  return receiver.app(req, res);
});

export const handler =
  serverless(expressApp);
