import type { AutonomousLabOrder } from "@dental/shared";

// In-memory registry for autonomous orders (tenant-scoped)
export const autonomousOrdersStore = new Map<string, AutonomousLabOrder>();
