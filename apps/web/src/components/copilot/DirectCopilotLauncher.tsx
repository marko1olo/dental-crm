/**
 * DirectCopilotLauncher.tsx — Standalone лаунчер клинического ассистента DENTE.
 * Мандат 8aq: Монтирование в живой UI (?copilot_standalone=1, #copilot-standalone).
 * Мандат 8b: размер <= 120 строк.
 */

import React, { useState } from "react";
import { CopilotDrawer } from "./CopilotDrawer";
import type { CopilotUiMessage, PendingConfirmation } from "./copilotTypes";

export function DirectCopilotLauncher(): React.ReactElement | null {
	if (typeof window === "undefined") return null;
	const s = window.location.search || "";
	const h = window.location.hash || "";
	const search = new URLSearchParams(s);

	const isCopilotStandalone =
		search.get("copilot_standalone") === "1" ||
		search.get("copilot_drawer") === "1" ||
		search.get("copilot_proof") === "1" ||
		h.includes("copilot-standalone") ||
		h.includes("copilot-drawer") ||
		h.includes("copilot-proof");

	console.log("[DirectCopilotLauncher] isCopilotStandalone:", isCopilotStandalone);

	const [activeTab, setActiveTab] = useState<"chat" | "pending">("chat");
	const [isOpen, setIsOpen] = useState(true);

	const [messages, setMessages] = useState<Array<CopilotUiMessage>>([
		{
			id: "msg-1",
			role: "user",
			kind: "text",
			text: "ДЕНТА, пациент Сидоров А.П., 36 зуб глубокий кариес. Сформируй протокол приёма и выпиши Нимесил.",
			timestamp: new Date().toISOString(),
		},
		{
			id: "msg-2",
			role: "assistant",
			kind: "text",
			text: "Сформирован клинический протокол осмотра зуба 36 и подготовлен рецептурный бланк. Все назначения проверены на совместимость.",
			timestamp: new Date().toISOString(),
		},
		{
			id: "msg-tool-exam",
			role: "assistant",
			kind: "tool",
			name: "clinical.save_examination_protocol",
			status: "done",
			result: {
				examination_protocol: {
					patientName: "Сидоров Алексей Петрович",
					tooth: "36",
					diagnosis: "K02.1 Кариес дентина (глубокий кариес)",
					complaints: "Кратковременные боли от температурных раздражителей в зубе 36.",
					anamnesis: "Полость обнаружена 2 недели назад, ранее лечение зуба 36 не проводилось.",
					objectiveStatus: "Глубокая кариозная полость MOD 36, зондирование болезненно по дну, перкуссия безболезненна.",
					treatmentPlan: "Препарирование полости MOD 36. Пломбирование наногибридным светоотверждаемым композитом.",
				},
			},
			timestamp: new Date().toISOString(),
		} as unknown as CopilotUiMessage,
		{
			id: "msg-tool-rx",
			role: "assistant",
			kind: "tool",
			name: "clinical.create_prescription",
			status: "done",
			result: {
				prescription: {
					series: "77-АА",
					number: "004821",
					patientName: "Сидоров Алексей Петрович",
					patientBirthDate: "14.06.1988",
					doctorName: "Д-р Барабаш С.В.",
					doctorSpecialty: "Врач-стоматолог-терапевт",
					diagnosisIcd10: "K02.1",
					diagnosisName: "Кариес дентина",
					validityDays: 60,
					drugs: [
						{
							id: "rx-1",
							mnn: "Nimesulide",
							tradeName: "Нимесил",
							latinName: "Tab. Nimesulidi",
							dosageForm: "гранулы для суспензии",
							dosage: "100 мг",
							quantity: "№ 10",
							signa: "По 1 пакетику 2 раза в день после еды при болях",
						},
					],
					isSignedUkep: true,
					ukepCertificate: "00E10352F71B39D48C19",
					ukepSignedAt: "28.10.2026 22:30",
				},
			},
			timestamp: new Date().toISOString(),
		} as unknown as CopilotUiMessage,
		{
			id: "msg-tool-workstation",
			role: "assistant",
			kind: "tool",
			name: "workstation.capture_screen",
			status: "done",
			result: {
				screen_capture: {
					appName: "Planmeca Romexis (Визиограф)",
					dimensions: "1440x900",
					format: "PNG",
					filePath: "storage/radiology/RVG_tooth_36_mod.png",
					status: "Снимок визиографа захвачен и прикреплен к приёму",
				},
			},
			timestamp: new Date().toISOString(),
		} as unknown as CopilotUiMessage,
	]);

	const [pending, setPending] = useState<PendingConfirmation | null>({
		callId: "call_save_exam_36_confirm",
		name: "save_examination_protocol",
		toolName: "save_examination_protocol",
		args: {
			tooth: "36",
			patientName: "Сидоров Алексей Петрович",
			diagnosis: "K02.1 Кариес дентина",
			treatment: "Пломбирование светоотверждаемым композитом MOD",
		},
	});

	if (!isCopilotStandalone) return null;

	return (
		<div
			className="fixed inset-0 z-[99990] flex flex-col pointer-events-auto"
			data-testid="standalone-copilot-launcher-root"
		>
			<CopilotDrawer
				isOpen={isOpen}
				messages={messages}
				busy={false}
				phase={null}
				pending={pending}
				nameCache={{ "call_tx_46_confirm": "Расчет плана лечения" }}
				activeTab={activeTab}
				onTabChange={setActiveTab}
				onClose={() => setIsOpen(false)}
				onSend={(text) => {
					setMessages((prev) => [
						...prev,
						{ id: `msg-${Date.now()}`, role: "user", kind: "text", text, timestamp: new Date().toISOString() },
					]);
				}}
				onConfirm={(decision) => {
					setPending(null);
					setMessages((prev) => [
						...prev,
						{
							id: `msg-${Date.now()}`,
							role: "assistant",
							kind: "text",
							text: decision === "confirm" ? "План лечения зуба 46 успешно утвержден и сохранен в карте пациента." : "Действие отклонено врачом.",
							timestamp: new Date().toISOString(),
						},
					]);
				}}
				onReset={() => {
					setMessages([]);
					setPending(null);
				}}
			/>
		</div>
	);
}
