import { prisma } from "./db";
import { firebaseAdminConfigured, firebaseAdminMessaging } from "./firebase-admin";

function firebaseMessaging() {
  return firebaseAdminMessaging();
}

export function pushStatus() {
  return { configured: firebaseAdminConfigured() };
}

export async function sendPushToUsers(input: { userIds: string[]; title: string; body: string; eventId?: string }) {
  const messaging = firebaseMessaging();
  if (!messaging || !input.userIds.length) return { sent: 0, devices: 0, configured: Boolean(messaging) };
  const devices = await prisma.devicePushToken.findMany({ where: { userId: { in: input.userIds } }, select: { token: true } });
  let sent = 0;
  for (let offset = 0; offset < devices.length; offset += 500) {
    const tokens = devices.slice(offset, offset + 500).map((device) => device.token);
    const result = await messaging.sendEachForMulticast({
      tokens,
      notification: { title: input.title, body: input.body },
      data: { route: "/app", ...(input.eventId ? { eventId: input.eventId } : {}) },
      android: { priority: "high", notification: { channelId: "trainerplan-termine" } },
      apns: { payload: { aps: { sound: "default" } } },
    });
    sent += result.successCount;
    const invalid = result.responses.flatMap((response, index) => {
      const code = response.error?.code;
      return code === "messaging/registration-token-not-registered" || code === "messaging/invalid-registration-token" ? [tokens[index]] : [];
    });
    if (invalid.length) await prisma.devicePushToken.deleteMany({ where: { token: { in: invalid } } });
  }
  return { sent, devices: devices.length, configured: true };
}
