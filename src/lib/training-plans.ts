import { Prisma } from "@prisma/client";
import type { TrainingPlanMeta } from "@/data/club";
import type { Exercise } from "@/data/demo";
import { prisma } from "./db";
import { ApiInputError } from "./api-security";
import { validatePlans } from "./validators";
import type { User } from "@prisma/client";
import { activeClubScope, clubConfigId, ensureClubConfig } from "./club-context";

const json = (value: unknown) => value as Prisma.InputJsonValue;

export type TrainingPlansPayload = {
  plans: Record<string, Exercise[]>;
  planMeta: Record<string, TrainingPlanMeta>;
};

export async function getTrainingPlans(user: Pick<User, "id">): Promise<TrainingPlansPayload> {
  const scope = await activeClubScope(user);
  const scopedConfig = scope ? await ensureClubConfig(scope) : null;
  const config = await prisma.appConfig.findUnique({
    where: { id: scope ? clubConfigId(scope) : "default" },
    select: { plans: true, planMeta: true },
  }) ?? scopedConfig ?? await prisma.appConfig.findUniqueOrThrow({ where: { id: "default" }, select: { plans: true, planMeta: true } });

  return {
    plans: config.plans as unknown as Record<string, Exercise[]>,
    planMeta: config.planMeta as unknown as Record<string, TrainingPlanMeta>,
  };
}

export async function saveTrainingPlans(value: unknown, user: Pick<User, "id">): Promise<TrainingPlansPayload> {
  const data = validatePlans(value) as TrainingPlansPayload;
  const trainerIds = [
    ...new Set(
      Object.values(data.plans)
        .flatMap((exercises) => exercises.map((exercise) => exercise.trainerId))
        .filter((id): id is string => typeof id === "string" && Boolean(id)),
    ),
  ];

  const scope = await activeClubScope(user);
  if (!scope) throw new ApiInputError("Der Vereinskontext ist noch nicht eingerichtet.", 409);
  await ensureClubConfig(scope);
  if (trainerIds.length && (await prisma.membership.count({ where: { userId: { in: trainerIds }, clubId: scope.clubId, teamId: scope.teamId, status: "active", role: { in: ["admin", "trainer"] } } })) !== trainerIds.length) {
    throw new ApiInputError("Ein ausgewählter Trainer existiert nicht oder hat keine Trainerrolle.");
  }

  await prisma.appConfig.update({
    where: { id: clubConfigId(scope) },
    data: { plans: json(data.plans), planMeta: json(data.planMeta) },
  });

  return data;
}
