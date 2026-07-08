import { randomUUID } from "node:crypto";

// Mocking db imports to keep it simple and compileable in the backend
interface ClinicalTask {
  id: string;
  organizationId: string;
  patientId: string;
  treatmentPlanId?: string;
  taskType: string;
  status: "pending" | "in_progress" | "completed" | "cancelled";
  title: string;
  description?: string;
}

export class ClinicalRouter {
  /**
   * Evaluates a completed phase and creates handoff tasks for the next phase.
   * e.g. Phase I (Therapy) -> Phase II (Orthopedics)
   */
  public async handlePhaseCompletion(
    organizationId: string,
    patientId: string,
    completedPhaseCode: string, // e.g. "PHASE_1_THERAPY"
    notes: string,
    toothCodes: string[]
  ): Promise<ClinicalTask | null> {
    
    let nextTaskType = "";
    let nextTaskTitle = "";
    let nextTaskDesc = "";

    if (completedPhaseCode === "PHASE_1_THERAPY") {
      nextTaskType = "prosthetics_handoff";
      nextTaskTitle = "Phase II: Orthopedic Handoff";
      nextTaskDesc = `Therapy phase completed for teeth: ${toothCodes.join(", ")}. Handoff notes: ${notes}. Please review for prosthetics.`;
    } else if (completedPhaseCode === "PHASE_2_SURGERY") {
      nextTaskType = "prosthetics_handoff";
      nextTaskTitle = "Phase II: Orthopedic Handoff after Surgery";
      nextTaskDesc = `Surgery completed for teeth: ${toothCodes.join(", ")}. Notes: ${notes}. Proceed with prosthetics after healing.`;
    } else {
      return null;
    }

    // In a real implementation, we would insert into the DB via Drizzle:
    // await db.insert(clinicalTasks).values({...})
    
    const newTask: ClinicalTask = {
      id: randomUUID(),
      organizationId,
      patientId,
      taskType: nextTaskType,
      title: nextTaskTitle,
      description: nextTaskDesc,
      status: "pending"
    };

    console.log(`[ClinicalRouter] Created handoff task: ${newTask.title}`);
    return newTask;
  }
}
