import { v4 as uuidv4 } from "uuid";
export class ClinicalRouter {
    /**
     * Evaluates a completed phase and creates handoff tasks for the next phase.
     * e.g. Phase I (Therapy) -> Phase II (Orthopedics)
     */
    async handlePhaseCompletion(organizationId, patientId, completedPhaseCode, // e.g. "PHASE_1_THERAPY"
    notes, toothCodes) {
        let nextTaskType = "";
        let nextTaskTitle = "";
        let nextTaskDesc = "";
        if (completedPhaseCode === "PHASE_1_THERAPY") {
            nextTaskType = "prosthetics_handoff";
            nextTaskTitle = "Phase II: Orthopedic Handoff";
            nextTaskDesc = `Therapy phase completed for teeth: ${toothCodes.join(", ")}. Handoff notes: ${notes}. Please review for prosthetics.`;
        }
        else if (completedPhaseCode === "PHASE_2_SURGERY") {
            nextTaskType = "prosthetics_handoff";
            nextTaskTitle = "Phase II: Orthopedic Handoff after Surgery";
            nextTaskDesc = `Surgery completed for teeth: ${toothCodes.join(", ")}. Notes: ${notes}. Proceed with prosthetics after healing.`;
        }
        else {
            return null;
        }
        // In a real implementation, we would insert into the DB via Drizzle:
        // await db.insert(clinicalTasks).values({...})
        const newTask = {
            id: uuidv4(),
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
