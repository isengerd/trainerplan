import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { validateTemplates } from "./validators";
import type { User } from "@prisma/client";
import { activeClubScope, clubConfigId, ensureClubConfig } from "./club-context";
import { ApiInputError } from "./api-security";

const json = (value: unknown) => value as Prisma.InputJsonValue;

export type TrainingTemplateRecord = {
  id: string;
  name: string;
  kind: "plan" | "phase";
  exercises: unknown[];
  focus?: string[];
  phase?: string;
  autoApply?: boolean;
};

export async function getTemplates(user: Pick<User, "id">) {
  const scope = await activeClubScope(user);
  if (!scope) throw new ApiInputError("Der Vereinskontext ist noch nicht eingerichtet.", 409);
  const config = await ensureClubConfig(scope);
  if (!config) throw new ApiInputError("Die Mannschaftskonfiguration fehlt.", 404);
  return config.templates as unknown as TrainingTemplateRecord[];
}

export async function saveTemplate(value: unknown, user: Pick<User, "id">) {
  const [template] = validateTemplates([value]) as TrainingTemplateRecord[];
  const current = await getTemplates(user);
  const scope = await activeClubScope(user);
  if (!scope) throw new ApiInputError("Der Vereinskontext ist noch nicht eingerichtet.", 409);
  const next = current.some((item) => item.id === template.id) ? current.map((item) => item.id === template.id ? template : item) : [...current, template];
  await prisma.appConfig.update({ where: { id: clubConfigId(scope) }, data: { templates: json(next) } });
  return template;
}

export async function deleteTemplate(id: string, user: Pick<User, "id">) {
  const current = await getTemplates(user);
  const scope = await activeClubScope(user);
  if (!scope) throw new ApiInputError("Der Vereinskontext ist noch nicht eingerichtet.", 409);
  await prisma.appConfig.update({ where: { id: clubConfigId(scope) }, data: { templates: json(current.filter((item) => item.id !== id)) } });
}
