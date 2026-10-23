/**
 * EmkStandaloneLauncher.tsx — Standalone лаунчер амбулаторной электронной медицинской карты приёма.
 * Соответствует Mandate 8b (Layer 5 Facade, <= 120 строк) и Mandate 8aq (монтирование в живой UI).
 */

import React, { useState } from "react";
import { VisitEmkTab } from "../../../../visit/VisitEmkTab";

function StandaloneEmkWorkspace() {
	const [visitForm, setVisitForm] = useState<Record<string, any>>({
		complaint: "Периодическая ноющая боль в зубе 1.6 при приёме горячей и холодной пищи.",
		anamnesis: "Соматически здоров. Аллергологический анамнез не отягощен.",
		objectiveStatus: "Зуб 1.6: глубокая кариозная полость на жевательно-медиальной поверхности (MOD), дентин пигментирован, зондирование болезненно по дну.",
		diagnosis: "K04.0 Начальный пульпит зуба 1.6",
		treatmentPlan: "Анестезия Ультракаин Д-С 1.7 мл, препарирование, медикаментозная обработка, наложение девитализирующей пасты, временная пломба.",
		recommendations: "Явка на повторный приём через 5-7 дней для пломбирования корневых каналов.",
	});

	const activePatient = {
		id: "demo-pat-emk-360",
		fullName: "Смирнова Анна Сергеевна",
		birthDate: "1992-05-14",
		gender: "female",
		phone: "+7 (925) 987-65-43",
		cardNumber: "СТ-2026-0843",
		hasSignedContract: true,
		hasSignedConsent: true,
	};

	const demoDashboard = {
		patients: [activePatient],
		documents: [
			{ kind: "paid_medical_services_contract", status: "issued", patientId: activePatient.id },
			{ kind: "informed_consent", status: "issued", patientId: activePatient.id },
		],
	};

	return (
		<div
			className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-5 overflow-y-auto"
			data-testid="emk-standalone-workspace"
		>
			<div className="max-w-6xl mx-auto space-y-4">
				<VisitEmkTab
					activePatient={activePatient as any}
					dashboard={demoDashboard as any}
					openVisitId="demo-visit-emk-live"
					visitNoteForm={visitForm}
					updateVisitNoteField={(field: string, value: any) =>
						setVisitForm((prev) => ({ ...prev, [field]: value }))
					}
				/>
			</div>
		</div>
	);
}

export function renderEmkLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";

	if (s.includes("emk") || h.includes("emk")) {
		return <StandaloneEmkWorkspace />;
	}

	return null;
}
