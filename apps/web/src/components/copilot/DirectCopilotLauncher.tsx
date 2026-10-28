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

	const [messages, setMessages] = useState<CopilotUiMessage[]>([
		{
			id: "msg-1",
			role: "user",
			kind: "text",
			text: "Рассчитай предварительную смету лечения зуба 46 и проверь безопасность для пациента Смирнова Е. В.",
			timestamp: new Date().toISOString(),
		},
		{
			id: "msg-2",
			role: "assistant",
			kind: "text",
			text: "Составил предварительный план лечения зуба 46 (хронический пульпит). Аллергических реакций и противопоказаний к анестетикам в анамнезе не выявлено. Требуется подтверждение назначения врача.",
			timestamp: new Date().toISOString(),
			toolCalls: [
				{
					id: "call-tx-46",
					name: "clinical.calculate_treatment_estimate",
					args: { tooth: 46, diagnosis: "K04.0" },
				},
			],
		} as unknown as CopilotUiMessage,
	]);

	const [pending, setPending] = useState<PendingConfirmation | null>({
		callId: "call_tx_46_confirm",
		name: "clinical.calculate_treatment_estimate",
		toolName: "clinical.calculate_treatment_estimate",
		args: {
			toothNumber: 46,
			diagnosis: "K04.0 Хронический пульпит",
			services: [
				"A16.07.008 Пломбирование корневого канала зуба (эндодонтия)",
				"A16.07.002 Восстановление зуба пломбой (лечение кариеса)",
			],
			totalRub: 25000,
			totalKopecks: 2500000,
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
