import admin from "firebase-admin";
import { ENV_VALUES } from "./config.js";

admin.initializeApp({
  credential: admin.credential.cert({
    projectId:
      ENV_VALUES.FIREBASE_PROJECT_ID,
    clientEmail:
      ENV_VALUES.FIREBASE_CLIENT_EMAIL,
    privateKey:
      ENV_VALUES.FIREBASE_PRIVATE_KEY.replace(
        /\\n/g,
        "\n"
      ),
  }),
});

const db = admin.firestore();

const POINTS_COLLECTION = "points";

export const getUserPoints = async (
  userId
) => {
  const userRef = db
    .collection(POINTS_COLLECTION)
    .doc(userId);
  const docSnap = await userRef.get();

  if (!docSnap.exists) {
    return 0;
  }

  const data = docSnap.data();
  return data.points || 0;
};

export const addPoints = async (
  userId,
  points
) => {
  const userRef = db
    .collection(POINTS_COLLECTION)
    .doc(userId);

  const currentPoints =
    await getUserPoints(userId);

  const newTotal =
    currentPoints + points;

  await userRef.set({
    points: newTotal,
  });

  return newTotal;
};

export const getAllUserPoints =
  async () => {
    const snapshot = await db
      .collection(POINTS_COLLECTION)
      .get();

    const users = snapshot.docs.map(
      (doc) => ({
        id: doc.id,
        points: doc.data().points || 0,
      })
    );

    return users;
  };
