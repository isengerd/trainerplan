import { Prisma } from "@prisma/client";
import type { Exercise } from "@/data/demo";
import { prisma } from "./db";
import { ensureApplicationData } from "./server-data";
import { validateExercises } from "./validators";
import type { User } from "@prisma/client";
import { activeClubScope, scopedResourceWhere } from "./club-context";

const json = (value: unknown) => value as Prisma.InputJsonValue;

export async function getExercises(user: Pick<User, "id">): Promise<Exercise[]> {
  await ensureApplicationData();
  const scope = await activeClubScope(user);
  const records = await prisma.exerciseRecord.findMany({ where: scope ? { OR: [scopedResourceWhere(scope), { clubId: null }] } : { clubId: null }, orderBy: { createdAt: "asc" } });
  return records.map((record) => record.data as unknown as Exercise);
}

export async function saveExercise(value: unknown, user: Pick<User, "id">): Promise<Exercise> {
  const [exercise] = validateExercises([value]);
  const scope = await activeClubScope(user);
  if (!scope) throw new Error("Der Vereinskontext ist noch nicht eingerichtet.");
  await prisma.exerciseRecord.upsert({
    where: { id: exercise.id },
    update: { data: json(exercise), ...scopedResourceWhere(scope) },
    create: { id: exercise.id, data: json(exercise), ...scopedResourceWhere(scope) },
  });
  return exercise;
}

export async function deleteExercise(id: string, user: Pick<User, "id">) {
  const scope = await activeClubScope(user);
  if (!scope) return;
  await prisma.exerciseRecord.deleteMany({ where: { id, ...scopedResourceWhere(scope) } });
}
