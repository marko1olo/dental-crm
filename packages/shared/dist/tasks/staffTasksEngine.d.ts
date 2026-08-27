/**
 * Staff Tasks & Internal Clinic Delegation Engine.
 * Adapted from dentalpin staff_tasks module for DENTE Dental CRM.
 *
 * Implements role-based task delegation, urgency queues, due date tracking,
 * and status transitions.
 */
import { z } from "zod";
export declare const staffRoleSchema: z.ZodEnum<["doctor", "administrator", "assistant", "nurse", "coordinator", "technician", "management"]>;
export type StaffRole = z.infer<typeof staffRoleSchema>;
export declare const taskPrioritySchema: z.ZodEnum<["urgent", "normal", "low"]>;
export type TaskPriority = z.infer<typeof taskPrioritySchema>;
export declare const taskStatusSchema: z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>;
export type TaskStatus = z.infer<typeof taskStatusSchema>;
export declare const staffTaskItemSchema: z.ZodObject<{
    id: z.ZodOptional<z.ZodString>;
    organizationId: z.ZodString;
    clinicId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    title: z.ZodString;
    description: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    patientId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    patientFullName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    assignedStaffId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    assignedStaffName: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    assignedRole: z.ZodNullable<z.ZodOptional<z.ZodEnum<["doctor", "administrator", "assistant", "nurse", "coordinator", "technician", "management"]>>>;
    priority: z.ZodDefault<z.ZodEnum<["urgent", "normal", "low"]>>;
    status: z.ZodDefault<z.ZodEnum<["pending", "in_progress", "completed", "cancelled"]>>;
    dueDate: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    completedAt: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    createdByStaffId: z.ZodNullable<z.ZodOptional<z.ZodString>>;
    createdAt: z.ZodOptional<z.ZodString>;
    updatedAt: z.ZodOptional<z.ZodString>;
}, "strip", z.ZodTypeAny, {
    status: "in_progress" | "completed" | "pending" | "cancelled";
    organizationId: string;
    title: string;
    priority: "normal" | "low" | "urgent";
    id?: string | undefined;
    patientId?: string | null | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    patientFullName?: string | null | undefined;
    clinicId?: string | null | undefined;
    description?: string | null | undefined;
    completedAt?: string | null | undefined;
    dueDate?: string | null | undefined;
    assignedStaffId?: string | null | undefined;
    assignedStaffName?: string | null | undefined;
    assignedRole?: "doctor" | "administrator" | "assistant" | "nurse" | "coordinator" | "technician" | "management" | null | undefined;
    createdByStaffId?: string | null | undefined;
}, {
    organizationId: string;
    title: string;
    status?: "in_progress" | "completed" | "pending" | "cancelled" | undefined;
    id?: string | undefined;
    patientId?: string | null | undefined;
    createdAt?: string | undefined;
    updatedAt?: string | undefined;
    patientFullName?: string | null | undefined;
    clinicId?: string | null | undefined;
    description?: string | null | undefined;
    completedAt?: string | null | undefined;
    dueDate?: string | null | undefined;
    priority?: "normal" | "low" | "urgent" | undefined;
    assignedStaffId?: string | null | undefined;
    assignedStaffName?: string | null | undefined;
    assignedRole?: "doctor" | "administrator" | "assistant" | "nurse" | "coordinator" | "technician" | "management" | null | undefined;
    createdByStaffId?: string | null | undefined;
}>;
export type StaffTaskItem = z.infer<typeof staffTaskItemSchema>;
export interface StaffTaskFilters {
    readonly role?: StaffRole | undefined;
    readonly staffId?: string | undefined;
    readonly status?: TaskStatus | undefined;
    readonly priority?: TaskPriority | undefined;
    readonly overdueOnly?: boolean | undefined;
    readonly patientId?: string | undefined;
}
/**
 * Validates allowed state transitions for clinic staff tasks.
 */
export declare function canTransitionStaffTaskStatus(current: TaskStatus, target: TaskStatus): boolean;
/**
 * Determines whether a staff task is overdue relative to a reference date.
 */
export declare function isStaffTaskOverdue(task: StaffTaskItem, now?: Date): boolean;
/**
 * Filters and sorts staff tasks according to clinic operational criteria.
 */
export declare function filterStaffTasks(tasks: readonly StaffTaskItem[], filters?: StaffTaskFilters, now?: Date): StaffTaskItem[];
