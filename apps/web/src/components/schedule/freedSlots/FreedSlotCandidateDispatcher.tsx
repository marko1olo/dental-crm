import React from "react";
import { Check } from "lucide-react";
import { showToast } from "../../GlobalToast";
import { WaitlistMatchesBlock } from "../WaitlistMatchesBlock";
import { type FreedSlot, calledKey } from "./types";

interface Props {
	slot: FreedSlot;
	isOpen: boolean;
	onToggleOpen: () => void;
	called: Set<string>;
	onMarkCalled: (key: string) => void;
	onSelectPatientId?: (id: string) => void;
}

export const FreedSlotCandidateDispatcher: React.FC<Props> = ({
	slot, isOpen, onToggleOpen, called, onMarkCalled, onSelectPatientId,
}) => {
	const best = (slot?.topMatches ?? [])[0];

	if ((slot?.topMatches ?? []).length === 0) {
		return (
			<div className="space-y-1.5">
				<span className="ops-note block">
					В листе ожидания подходящих нет
					{(slot?.candidatesTotal ?? 0) > 0 ? ` (в очереди ${slot.candidatesTotal})` : ", очередь пуста"}
					. Окно можно отдать под запись с улицы.
				</span>
				{(slot?.candidatesTotal ?? 0) > 0 ? (
					<button
						className="link-button h-8 inline-flex items-center text-xs font-semibold cursor-pointer pointer-coarse:min-h-[44px]"
						type="button"
						onClick={onToggleOpen}
					>
						{isOpen ? "Скрыть полный подбор" : "Полный подбор из очереди"}
					</button>
				) : null}
				{isOpen ? (
					<div style={{ marginTop: 8 }}>
						<WaitlistMatchesBlock appointmentId={slot.appointmentId} compact />
					</div>
				) : null}
			</div>
		);
	}

	const isCandidateCalled = called.has(calledKey(slot.appointmentId, best?.patientId));

	return (
		<div className="space-y-1 min-w-0">
			<div className="flex items-center justify-between gap-2">
				<span className="ops-strong truncate max-w-[200px]" title={best?.patientName}>
					{best?.patientName}
				</span>
				{isCandidateCalled ? (
					<span className="ops-note inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
						<span>Позвонили</span>
						<Check className="w-3.5 h-3.5 text-emerald-500 inline shrink-0" />
					</span>
				) : (
					<button
						className="secondary-button h-8 px-2.5 min-h-[32px] text-xs font-semibold inline-flex items-center cursor-pointer pointer-coarse:min-h-[44px]"
						type="button"
						disabled={false}
						onClick={() => {
							if (!best?.phone) {
								showToast("У пациента не указан телефон. Открыть карточку для ввода?", "warning");
								if (best?.patientId && onSelectPatientId) onSelectPatientId(best.patientId);
								return;
							}
							onMarkCalled(calledKey(slot.appointmentId, best?.patientId));
						}}
					>
						Позвонил
					</button>
				)}
			</div>
			<span className="ops-note block text-xs">{best?.phone ?? "телефон не указан"}</span>
			{best?.reason && <span className="ops-note block text-xs break-words">{best.reason}</span>}
			<div className="pt-1">
				<button
					className="link-button h-8 inline-flex items-center text-xs font-semibold cursor-pointer pointer-coarse:min-h-[44px]"
					type="button"
					onClick={onToggleOpen}
					data-testid={`freed-slot-expand-${slot.appointmentId}`}
				>
					{isOpen
						? "Скрыть полный подбор"
						: (slot?.candidatesTotal ?? 0) > (slot?.topMatches ?? []).length
							? `Все из очереди (${slot?.candidatesTotal ?? 0})`
							: (slot?.topMatches ?? []).length > 1
								? `Ещё ${(slot?.topMatches ?? []).length - 1} и полный подбор`
								: "Полный подбор"}
				</button>
			</div>
			{isOpen ? (
				<div style={{ marginTop: 8 }} data-testid="freed-slot-full-matches">
					<WaitlistMatchesBlock appointmentId={slot.appointmentId} compact />
				</div>
			) : null}
		</div>
	);
};
