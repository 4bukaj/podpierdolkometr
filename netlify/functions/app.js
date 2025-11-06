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
  // socketMode: true,
  // appToken: ENV_VALUES.SLACK_APP_TOKEN,
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

    // const msgDate = new Date(
    //   parseFloat(event.ts) * 1000
    // );
    // const now = new Date();
    // const today946 = new Date(
    //   now.getFullYear(),
    //   now.getMonth(),
    //   now.getDate(),
    //   9,
    //   46,
    //   0
    // );

    // if (msgDate < today946) return;

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
  async ({ command, ack, say }) => {
    try {
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
            }> — *${
              user.points
            }* punktów`
        )
        .join("\n");

      await say({
        text: `*Ranking donosicieli:*\n${text}`,
      });
    } catch (error) {
      await say(
        "Przepraszamy, nie udało się pobrać punktów."
      );
    }
  }
);

receiver.app.post(
  "/",
  async (req, res) => {
    if (
      req.body.type ===
      "url_verification"
    ) {
      return res.status(200).send({
        challenge: req.body.challenge,
      });
    }

    return res.status(200).send();
  }
);

export const handler = receiver.app;
