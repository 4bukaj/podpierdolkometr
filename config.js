import dotenv from "dotenv";

dotenv.config();

export const ENV_VALUES = {
  SLACK_BOT_TOKEN:
    process.env.SLACK_BOT_TOKEN,
  SLACK_SIGNING_SECRET:
    process.env.SLACK_SIGNING_SECRET,
  SLACK_APP_TOKEN:
    process.env.SLACK_APP_TOKEN,
  FIREBASE_PROJECT_ID:
    process.env.FIREBASE_PROJECT_ID,
  FIREBASE_CLIENT_EMAIL:
    process.env.FIREBASE_CLIENT_EMAIL,
  FIREBASE_PRIVATE_KEY:
    process.env.FIREBASE_PRIVATE_KEY,
};
