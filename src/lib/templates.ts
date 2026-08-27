import { Prisma } from "@prisma/client";
import { prisma } from "./db";
import { validateTemplates } from "./validators";

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

export async function getTemplates() {
  const config = await prisma.appConfig.findUniqueOrThrow({ where: { id: "default" }, select: { templates: true } });
  return config.templates as unknown as TrainingTemplateRecord[];
}

export async function saveTemplate(value: unknown) {
  const [template] = validateTemplates([value]) as TrainingTemplateRecord[];
  const current = await getTemplates();
  const next = current.some((item) => item.id === template.id) ? current.map((item) => item.id === template.id ? template : item) : [...current, template];
  await prisma.appConfig.update({ where: { id: "default" }, data: { templates: json(next) } });
  return template;
}

export async function deleteTemplate(id: string) {
  const current = await getTemplates();
  await prisma.appConfig.update({ where: { id: "default" }, data: { templates: json(current.filter((item) => item.id !== id)) } });
}
