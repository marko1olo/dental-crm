export type PatientStatus = "vip_patient" | "active_treatment" | "new_lead" | "unknown";

export interface MissedCallData {
	organizationId: string;
	patientId?: string;
	patientStatus: PatientStatus;
	phoneNumber: string;
	receivedAt: Date;
}

export interface QueuedCallbackItem extends MissedCallData {
	id: string;
	slaDeadline: Date;
	priorityScore: number;
	status: "pending" | "in_progress" | "completed" | "sla_breached";
}

export class MissedCallCallbackQueueService {
	public static readonly SLA_MINUTES: Record<PatientStatus, number> = {
		vip_patient: 2,
		active_treatment: 5,
		new_lead: 10,
		unknown: 10,
	};

	public static readonly PRIORITY_SCORES: Record<PatientStatus, number> = {
		vip_patient: 100,
		active_treatment: 80,
		new_lead: 50,
		unknown: 30,
	};

	/**
	 * Расчет точного дедлайна перезвона по SLA
	 */
	public static calculateSlaDeadline(patientStatus: PatientStatus, receivedAt: Date = new Date()): Date {
		const minutes = this.SLA_MINUTES[patientStatus] ?? 10;
		return new Date(receivedAt.getTime() + minutes * 60 * 1000);
	}

	/**
	 * Определение приоритета перезвона
	 */
	public static getPriorityScore(patientStatus: PatientStatus): number {
		return this.PRIORITY_SCORES[patientStatus] ?? 30;
	}

	/**
	 * Проверка нарушения SLA перезвона
	 */
	public static isSlaBreached(slaDeadline: Date, now: Date = new Date()): boolean {
		return now > slaDeadline;
	}

	/**
	 * Создает структурированный элемент очереди перезвонов
	 */
	public static createQueueItem(
		id: string,
		data: MissedCallData,
		now: Date = new Date(),
	): QueuedCallbackItem {
		const slaDeadline = this.calculateSlaDeadline(data.patientStatus, data.receivedAt);
		const isBreached = this.isSlaBreached(slaDeadline, now);

		return {
			...data,
			id,
			slaDeadline,
			priorityScore: this.getPriorityScore(data.patientStatus),
			status: isBreached ? "sla_breached" : "pending",
		};
	}
}
