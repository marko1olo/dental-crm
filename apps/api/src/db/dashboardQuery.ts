import { dashboardSchema, type Dashboard } from "@dental/shared";
import { buildDashboard } from "../sampleData.js";

export class ClinicOrganizationMissingError extends Error {
  readonly organizationId: string;

  constructor(organizationId: string) {
    super("Клиника из сессии не найдена в базе данных.");
    this.name = "ClinicOrganizationMissingError";
    this.organizationId = organizationId;
  }
}

export async function getDashboardFromDb(organizationId: string): Promise<Dashboard> {
  const dashboard = buildDashboard();
  const parsed = dashboardSchema.safeParse(dashboard);
  if (!parsed.success) {
    console.error("[DashboardQuery] Сводка не соответствует контракту:");
    return dashboard;
  }
  return parsed.data;
}
