import type { DmsGuaranteeLetterStatus } from "./guaranteeTypes.js";

const VALID_STATUS_TRANSITIONS: Record<DmsGuaranteeLetterStatus, readonly DmsGuaranteeLetterStatus[]> = {
	draft: ["pending_approval", "active", "cancelled"],
	pending_approval: ["approved", "active", "cancelled"],
	approved: ["active", "cancelled"],
	active: ["billed", "exhausted", "expired", "cancelled"],
	billed: ["paid", "cancelled"],
	paid: [],
	exhausted: ["cancelled"],
	expired: ["cancelled"],
	cancelled: [],
};

export function canTransitionGuaranteeStatus(
	fromStatus: DmsGuaranteeLetterStatus,
	toStatus: DmsGuaranteeLetterStatus,
): boolean {
	if (fromStatus === toStatus) return true;
	const allowed = VALID_STATUS_TRANSITIONS[fromStatus];
	return allowed ? allowed.includes(toStatus) : false;
}

export function assertValidStatusTransition(
	fromStatus: DmsGuaranteeLetterStatus,
	toStatus: DmsGuaranteeLetterStatus,
): void {
	if (!canTransitionGuaranteeStatus(fromStatus, toStatus)) {
		throw new Error(
			`Недопустимый переход статуса гарантийного письма: из «${fromStatus}» в «${toStatus}»`,
		);
	}
}

export function getAvailableStatusTransitions(
	currentStatus: DmsGuaranteeLetterStatus,
): readonly DmsGuaranteeLetterStatus[] {
	return VALID_STATUS_TRANSITIONS[currentStatus] ?? [];
}

export const DMS_STATUS_DESCRIPTIONS: Record<DmsGuaranteeLetterStatus, string> = {
	draft: "Черновик гарантийного письма формируется в клинике",
	pending_approval: "Письмо направлено на рассмотрение куратору страховой организации",
	approved: "Страховая компания подтвердила гарантийное обязательство",
	active: "Письмо активно и готово к списанию согласованных сумм",
	billed: "Счет-реестр за оказанные услуги выставлен в страховую компанию",
	paid: "Страховая компания произвела полную оплату по выставленному счету",
	exhausted: "Выделенный лимит покрытия полностью исчерпан",
	expired: "Срок действия гарантийного письма истек",
	cancelled: "Гарантийное письмо аннулировано страховой компанией или клиникой",
};
