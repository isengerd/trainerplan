import { Prisma } from "@prisma/client";
import type { ClubSettings } from "@/data/club";
import { prisma } from "./db";
import { ApiInputError } from "./api-security";
import { validateSettings } from "./validators";
import type { User } from "@prisma/client";
import { activeClubScope, clubConfigId, ensureClubConfig } from "./club-context";

const json = (value: unknown) => value as Prisma.InputJsonValue;

export async function getSettings(user: Pick<User, "id">) {
  const scope = await activeClubScope(user);
  const scopedConfig = scope ? await ensureClubConfig(scope) : null;
  const config = scopedConfig
    ? { settings: scopedConfig.settings }
    : await prisma.appConfig.findUnique({ where: { id: scope ? clubConfigId(scope) : "default" }, select: { settings: true } })
    ?? await prisma.appConfig.findUniqueOrThrow({ where: { id: "default" }, select: { settings: true } });
  return config.settings as unknown as ClubSettings;
}

export async function saveSettings(value: unknown, user: Pick<User, "id">) {
  const settings = validateSettings(value);
  if (await prisma.ageGroup.count({ where: { id: { in: settings.ageGroupIds } } }) !== settings.ageGroupIds.length) throw new ApiInputError("Mindestens eine Altersklasse existiert nicht.");
  const scope = await activeClubScope(user);
  if (!scope) throw new ApiInputError("Der Vereinskontext ist noch nicht eingerichtet.", 409);
  await ensureClubConfig(scope);
  await prisma.appConfig.update({ where: { id: clubConfigId(scope) }, data: { settings: json(settings) } });
  return settings;
}
