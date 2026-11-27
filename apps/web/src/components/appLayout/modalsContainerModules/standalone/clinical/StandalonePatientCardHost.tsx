/**
 * StandalonePatientCardHost.tsx — Честный standalone хост комплексной карты пациента PatientCardModal (Мандат 8b <= 50 строк).
 * Позволяет мгновенно открыть каноническую карточку пациента (?patient_card=1, #patient-card).
 * Защищен от утечки демонстрационных данных в боевой контур (Мандат 8al, SEV-1.3).
 */

import React from "react";
import { User, Users } from "lucide-react";
import {
	PatientCardModal,
	DEMO_SHOWCASE_MODAL_PATIENT,
	DEMO_SHOWCASE_MODAL_SAFETY,
	type PatientCardTab,
} from "../../../../patients/PatientCardModal";
import { readPatientIdFromUrl, useLauncherPatientName } from "../useLauncherPatientDebt";
import { isDemoShowcaseMode } from "../../../../../lib/demoMode.js";

const VALID_PATIENT_CARD_TABS = new Set<PatientCardTab>([
	"general", "formula", "perio", "anamnesis", "visits", "documents",
	"radiology", "family", "finance", "treatmentPlans", "photos", "reclamations", "labOrders",
]);

function parsePatientCardTab(rawTab: string | null): PatientCardTab {
	if (rawTab && VALID_PATIENT_CARD_TABS.has(rawTab as PatientCardTab)) {
		return rawTab as PatientCardTab;
	}
	return "general";
}

export const StandalonePatientCardHost: React.FC<{ onClose: () => void }> = ({ onClose }) => {
	const patientId = readPatientIdFromUrl();
	const isDemo = isDemoShowcaseMode();
	const effectivePatientId: string = patientId || (isDemo ? (DEMO_SHOWCASE_MODAL_PATIENT.id || "00000000-0000-0000-0000-000000000001") : "");
	const launcherPatientName = useLauncherPatientName(effectivePatientId);

	// В боевом режиме без patientId показываем честный клинический Empty State
	if (!patientId && !isDemo) {
		return (
			<div
				className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center p-4"
				data-testid="patient-card-standalone-empty"
			>
				<div className="bg-[var(--paper-strong)] border border-[var(--line)] rounded-2xl p-6 text-center max-w-md w-full shadow-lg">
					<div className="w-12 h-12 rounded-xl bg-[var(--paper-soft)] border border-[var(--line)] flex items-center justify-center mx-auto mb-4 text-[var(--teal,#0d9488)]">
						<Users className="w-6 h-6" />
					</div>
					<h3 className="text-base font-semibold text-[var(--ink)] mb-1">
						Пациент не выбран
					</h3>
					<p className="text-xs text-[var(--muted)] mb-5">
						Для просмотра медицинской карты выберите пациента из реестра клиники
					</p>
					<div className="flex flex-wrap sm:flex-nowrap items-center justify-center gap-2">
						<button
							type="button"
							onClick={onClose}
							className="dente-btn dente-btn-secondary min-h-[44px] h-11 sm:min-h-[36px] sm:h-9 px-3.5 text-sm font-medium rounded-xl sm:rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] transition-colors cursor-pointer whitespace-nowrap shrink-0"
						>
							Закрыть
						</button>
						<button
							type="button"
							onClick={() => {
								if (typeof window !== "undefined") {
									window.location.hash = "patients";
								}
								onClose();
							}}
							className="dente-btn dente-btn-primary min-h-[44px] h-11 sm:min-h-[36px] sm:h-9 px-3.5 text-sm font-medium rounded-xl sm:rounded-lg border-0 bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-sm transition-colors cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
						>
							<User className="w-4 h-4 shrink-0" />
							<span>Перейти в картотеку</span>
						</button>
					</div>
				</div>
			</div>
		);
	}

	const initialPatient = isDemo && !patientId
		? DEMO_SHOWCASE_MODAL_PATIENT
		: launcherPatientName
			? { id: effectivePatientId, fullName: launcherPatientName }
			: null;

	const initialSafety = isDemo && !patientId ? DEMO_SHOWCASE_MODAL_SAFETY : undefined;

	const rawTab = typeof window !== "undefined" ? new URLSearchParams(window.location.search).get("tab") : null;
	const initialTab = parsePatientCardTab(rawTab);

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] flex items-center justify-center p-0 sm:p-4"
			data-testid="patient-card-standalone-root"
		>
			<PatientCardModal
				key={effectivePatientId || "draft"}
				isOpen={true}
				onClose={onClose}
				initialTab={initialTab}
				patientId={effectivePatientId}
				patient={initialPatient}
				safetyProfile={initialSafety}
			/>
		</div>
	);
};

export default StandalonePatientCardHost;
