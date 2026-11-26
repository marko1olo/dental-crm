import React, { useMemo } from "react";
import { createPortal } from "react-dom";
import { Activity, FileText, Pill, Printer, Redo2, ShieldCheck, Sparkles, Star, Undo2 } from "lucide-react";
import { CLINICAL_SOAP_PRESETS } from "../../clinicalSoapPresets";
import type { ClinicalSoapPreset } from "../../clinicalSoapTypes";
import { emitClinicEvent } from "../../../../lib/clinicEventBus";
import { useDoctorPreferencesStore } from "../../../../store/doctorPreferencesStore";

export interface EmkProtocolsDropdownMenuProps {
	isOpen: boolean;
	dropdownPos: { top: number; left: number };
	menuRef: React.RefObject<HTMLDivElement | null>;
	onClose: () => void;
	onApplySoapPreset?: ((preset: ClinicalSoapPreset) => void) | undefined;
	updateVisitNoteField?: ((field: string, value: string) => void) | undefined;
	onToggleStarProtocols?: (() => void) | undefined;
	onOpenConsent?: (() => void) | undefined;
	onPrintMedicalCard?: (() => void) | undefined;
	canUndo: boolean;
	canRedo: boolean;
	handleUndo: () => boolean | void;
	handleRedo: () => boolean | void;
}

function applyPresetFallback(
	preset: ClinicalSoapPreset,
	updateField?: (field: string, value: string) => void,
): void {
	if (!updateField) return;
	if (preset.complaint) updateField("complaint", preset.complaint);
	if (preset.anamnesis) updateField("anamnesis", preset.anamnesis);
	if (preset.statusLocalis) updateField("objectiveStatus", preset.statusLocalis);
	if (preset.icd10) updateField("diagnosis", `${preset.icd10}${preset.icd10Label ? ` ${preset.icd10Label}` : ""}`);
	if (preset.treatmentDescription) updateField("treatmentPlan", preset.treatmentDescription);
}

export function EmkProtocolsDropdownMenu({
	isOpen,
	dropdownPos,
	menuRef,
	onClose,
	onApplySoapPreset,
	updateVisitNoteField,
	onToggleStarProtocols,
	onOpenConsent,
	onPrintMedicalCard,
	canUndo,
	canRedo,
	handleUndo,
	handleRedo,
}: EmkProtocolsDropdownMenuProps) {
	const quickProtocolIds = useDoctorPreferencesStore((s) => s.preferences.quickProtocolIds);

	const personalMacros = useMemo(() => {
		const resolved = quickProtocolIds
			.map((id) => CLINICAL_SOAP_PRESETS.find((p) => p.id === id))
			.filter((p): p is ClinicalSoapPreset => Boolean(p));
		return resolved.slice(0, 4);
	}, [quickProtocolIds]);

	if (!isOpen || typeof document === "undefined") return null;

	return createPortal(
		<div
			ref={menuRef}
			className="fixed z-[9999] flex flex-col gap-0.5 p-1.5 bg-[var(--paper-strong,var(--paper))] border border-[var(--line)] rounded-xl shadow-2xl min-w-[268px] max-w-[calc(100vw-24px)] text-xs text-[var(--ink)] animate-in fade-in zoom-in-95 duration-100 backdrop-blur-md"
			style={{ top: `${dropdownPos.top}px`, left: `${dropdownPos.left}px` }}
			role="menu"
			aria-hidden={!isOpen}
		>
			{personalMacros.length > 0 && (
				<>
					<div className="px-2 py-1 text-[11px] font-medium text-[var(--ink-muted)]">
						Личные макросы врача
					</div>
					{personalMacros.map((macro) => (
						<button
							key={macro.id}
							type="button"
							data-testid={`btn-doctor-macro-${macro.id}`}
							onClick={() => {
								if (onApplySoapPreset) onApplySoapPreset(macro);
								else applyPresetFallback(macro, updateVisitNoteField);
								onClose();
							}}
							className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
						>
							<Star className="w-3.5 h-3.5 shrink-0 text-[var(--primary)]" />
							<span className="truncate">{macro.title}</span>
						</button>
					))}
					<div className="h-px bg-[var(--line)] my-1" />
				</>
			)}

			<div className="px-2 py-1 text-[11px] font-medium text-[var(--ink-muted)]">
				Клинические пространства
			</div>

			<button
				type="button"
				data-testid="btn-open-perio-chart-toolbar"
				onClick={() => {
					emitClinicEvent("studio:open", { studio: { kind: "perio" } });
					onClose();
				}}
				className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
			>
				<Activity className="w-3.5 h-3.5 shrink-0 text-[var(--ink-muted)]" />
				<span>Пародонтограмма и скрининг</span>
			</button>

			<button
				type="button"
				data-testid="btn-open-prescriptions-toolbar"
				onClick={() => {
					emitClinicEvent("studio:open", { studio: { kind: "prescriptions" } });
					onClose();
				}}
				className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
			>
				<Pill className="w-3.5 h-3.5 shrink-0 text-[var(--ink-muted)]" />
				<span>Выписать рецепт на лекарства</span>
			</button>

			<button
				type="button"
				data-testid="btn-open-implant-passport-toolbar"
				onClick={() => {
					emitClinicEvent("studio:open", { studio: { kind: "surgery", initialTab: "passport" } });
					onClose();
				}}
				className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
			>
				<FileText className="w-3.5 h-3.5 shrink-0 text-[var(--ink-muted)]" />
				<span>Паспорт имплантата</span>
			</button>

			<div className="h-px bg-[var(--line)] my-1" />

			<div className="px-2 py-1 text-[11px] font-medium text-[var(--ink-muted)]">
				Документы и протоколы
			</div>

			{onToggleStarProtocols && (
				<button
					type="button"
					data-testid="btn-toggle-star-protocols-toolbar"
					onClick={() => {
						onToggleStarProtocols();
						onClose();
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--primary)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
				>
					<Sparkles className="w-3.5 h-3.5 shrink-0" />
					<span>Клинические протоколы</span>
				</button>
			)}

			{onOpenConsent && (
				<button
					type="button"
					data-testid="btn-open-consent-toolbar"
					onClick={() => {
						onOpenConsent();
						onClose();
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
				>
					<ShieldCheck className="w-3.5 h-3.5 shrink-0 text-[var(--ink-muted)]" />
					<span>Согласие пациента</span>
				</button>
			)}

			{onPrintMedicalCard && (
				<button
					type="button"
					data-testid="btn-print-medical-card-toolbar"
					onClick={() => {
						onPrintMedicalCard();
						onClose();
					}}
					className="w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-2 cursor-pointer transition-colors"
				>
					<Printer className="w-3.5 h-3.5 shrink-0 text-[var(--ink-muted)]" />
					<span>Печать медицинской карты</span>
				</button>
			)}

			<div className="h-px bg-[var(--line)] my-1" />

			<button
				type="button"
				onClick={() => {
					if (canUndo) handleUndo();
					onClose();
				}}
				className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-between cursor-pointer transition-colors ${
					!canUndo ? "opacity-50" : ""
				}`}
			>
				<span className="flex items-center gap-2">
					<Undo2 className="w-3.5 h-3.5 shrink-0" />
					<span>Отменить ввод</span>
				</span>
				<kbd className="text-[10px] font-mono text-[var(--ink-muted)]">Ctrl+Z</kbd>
			</button>

			<button
				type="button"
				onClick={() => {
					if (canRedo) handleRedo();
					onClose();
				}}
				className={`w-full text-left px-2.5 py-1.5 rounded-lg font-medium text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center justify-between cursor-pointer transition-colors ${
					!canRedo ? "opacity-50" : ""
				}`}
			>
				<span className="flex items-center gap-2">
					<Redo2 className="w-3.5 h-3.5 shrink-0" />
					<span>Вернуть ввод</span>
				</span>
				<kbd className="text-[10px] font-mono text-[var(--ink-muted)]">Ctrl+Y</kbd>
			</button>
		</div>,
		document.body,
	);
}
