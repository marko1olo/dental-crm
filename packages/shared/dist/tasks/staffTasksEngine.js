/**
 * Staff Tasks & Internal Clinic Delegation Engine.
 * Adapted from dentalpin staff_tasks module for DENTE Dental CRM.
 *
 * Implements role-based task delegation, urgency queues, due date tracking,
 * and status transitions.
 */
import { z } from "zod";
export const staffRoleSchema = z.enum([
    "doctor",
    "administrator",
    "assistant",
    "nurse",
    "coordinator",
    "technician",
    "management",
]);
export const taskPrioritySchema = z.enum(["urgent", "normal", "low"]);
export const taskStatusSchema = z.enum([
    "pending",
    "in_progress",
    "completed",
    "cancelled",
]);
export const staffTaskItemSchema = z.object({
    id: z.string().uuid().optional(),
    organizationId: z.string().uuid(),
    clinicId: z.string().uuid().optional().nullable(),
    title: z.string().min(1).max(200),
    description: z.string().max(2000).optional().nullable(),
    patientId: z.string().uuid().optional().nullable(),
    patientFullName: z.string().optional().nullable(),
    assignedStaffId: z.string().uuid().optional().nullable(),
    assignedStaffName: z.string().optional().nullable(),
    assignedRole: staffRoleSchema.optional().nullable(),
    priority: taskPrioritySchema.default("normal"),
    status: taskStatusSchema.default("pending"),
    dueDate: z.string().optional().nullable(), // YYYY-MM-DD
    completedAt: z.string().datetime().optional().nullable(),
    createdByStaffId: z.string().uuid().optional().nullable(),
    createdAt: z.string().datetime().optional(),
    updatedAt: z.string().datetime().optional(),
});
/**
 * Validates allowed state transitions for clinic staff tasks.
 */
export function canTransitionStaffTaskStatus(current, target) {
    if (current === target)
        return true;
    const transitions = {
        pending: ["in_progress", "completed", "cancelled"],
        in_progress: ["completed", "cancelled", "pending"],
        completed: ["pending"], // Re-opening
        cancelled: ["pending"],
    };
    return transitions[current]?.includes(target) ?? false;
}
/**
 * Determines whether a staff task is overdue relative to a reference date.
 */
export function isStaffTaskOverdue(task, now = new Date()) {
    if (task.status === "completed" || task.status === "cancelled") {
        return false;
    }
    if (!task.dueDate)
        return false;
    const todayIso = now.toISOString().slice(0, 10);
    return task.dueDate < todayIso;
}
/**
 * Filters and sorts staff tasks according to clinic operational criteria.
 */
export function filterStaffTasks(tasks, filters = {}, now = new Date()) {
    return tasks.filter((task) => {
        if (filters.status && task.status !== filters.status)
            return false;
        if (filters.priority && task.priority !== filters.priority)
            return false;
        if (filters.role && task.assignedRole !== filters.role)
            return false;
        if (filters.staffId && task.assignedStaffId !== filters.staffId)
            return false;
        if (filters.patientId && task.patientId !== filters.patientId)
            return false;
        if (filters.overdueOnly && !isStaffTaskOverdue(task, now))
            return false;
        return true;
    });
}
