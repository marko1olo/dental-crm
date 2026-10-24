/**
 * StandaloneImplantologyHosts — честные хосты паспортов имплантации, RVG и КТ (Мандат 8b).
 *
 * Пациент — только из ?patientId= и базы (GET /api/patients/:id).
 * Вымышленные пациенты и демо-идентификаторы выжжены.
 */

import type React from "react";
import { useMemo } from "react";
import { lazyWithRetry } from "../../../../../lib/lazyWithRetry";
import { AppLoadingState } from "../../../../../AppBootState";
import StandaloneDeepLinkMissingState from "../StandaloneDeepLinkMissingState";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";

const ImplantPassportModal = lazyWithRetry(() =>
	import("../../../../implants/ImplantPassportModal").then((m) => ({ default: m.ImplantPassportModal })),
);
const DirectRvgCaptureModal = lazyWithRetry(() =>
	import("../../../../radiology/DirectRvgCaptureModal").then((m) => ({ default: m.DirectRvgCaptureModal })),
);
const CtSelectorModal = lazyWithRetry(() =>
	import("../../../../radiology/CtSelectorModal").then((m) => ({ default: m.CtSelectorModal })),
);

const GUARD_MESSAGE =
	"Имплантология и снимки ведутся по конкретному пациенту. Добавьте ?patientId= в ссылку или откройте раздел из карты пациента.";

function usePatientGuard(
	testId: string,
	onClose: () => void,
): { patientId: string | null; guard: React.ReactElement | null; patientName: string | null } {
	const patientId = useMemo(() => readPatientIdFromUrl(), []);
	const patientName = useLauncherPatientName(patientId);
	let guard: React.ReactElement | null = null;
	if (!patientId) {
		guard = <StandaloneDeepLinkMissingState title="Пациент не указан" message={GUARD_MESSAGE} testId={testId} onClose={onClose} />;
	} else if (patientName === null) {
		guard = <AppLoadingState message="Загрузка карточки пациента..." />;
	}
	return { patientId, patientName, guard };
}

export const StandaloneImplantPassportHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const { patientId, patientName, guard } = usePatientGuard("standalone-implant-missing-state", onClose);
	if (guard) return guard;
	return (
		<ImplantPassportModal
			isOpen={true}
			onClose={onClose}
			patientId={patientId || undefined}
			patientName={patientName || undefined}
		/>
	);
};

export const StandaloneRvgHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const { patientId, patientName, guard } = usePatientGuard("standalone-rvg-missing-state", onClose);
	if (guard) return guard;
	return (
		<DirectRvgCaptureModal
			isOpen={true}
			onClose={onClose}
			patientId={patientId || undefined}
			patientName={patientName || undefined}
		/>
	);
};

export const StandaloneCtSelectorHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const { patientId, patientName, guard } = usePatientGuard("standalone-ct-selector-missing-state", onClose);
	if (guard) return guard;
	return (
		<CtSelectorModal
			isOpen={true}
			onClose={onClose}
			patientId={patientId || undefined}
			patientName={patientName || undefined}
		/>
	);
};
