export type BookingStepIndex = 1 | 2 | 3 | 4 | 5;

export interface BookingStepDescriptor {
	step: BookingStepIndex;
	title: string;
	description: string;
}

export const BOOKING_STEPS: Record<BookingStepIndex, BookingStepDescriptor> = {
	1: { step: 1, title: "Выбор услуги", description: "Категория стоматологической помощи" },
	2: { step: 2, title: "Выбор врача", description: "Специалист или любое свободное время" },
	3: { step: 3, title: "Дата и время", description: "Свободное окно в расписании" },
	4: { step: 4, title: "Контакты", description: "Имя и номер телефона для подтверждения" },
	5: { step: 5, title: "Талон записи", description: "Подтверждение бронирования и маршрут" },
};

export function canAdvanceToStep(targetStep: BookingStepIndex, hasDoctor: boolean, hasSlot: boolean): boolean {
	if (targetStep <= 2) return true;
	if (targetStep === 3) return hasDoctor;
	if (targetStep >= 4) return hasDoctor && hasSlot;
	return true;
}

export function getNextStep(current: BookingStepIndex): BookingStepIndex {
	if (current >= 5) return 5;
	return (current + 1) as BookingStepIndex;
}

export function getPrevStep(current: BookingStepIndex): BookingStepIndex {
	if (current <= 1) return 1;
	return (current - 1) as BookingStepIndex;
}
