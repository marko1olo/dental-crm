import type { SterilizerEquipment } from "@dental/shared";
import { Clock, Flame, Wrench, X } from "lucide-react";
import React from "react";
import { createPortal } from "react-dom";
import {
	SterilizerCycleLogsTable,
	SterilizerMaintenanceSchedule,
	SterilizerModalFooterActions,
	SterilizerPassportCard,
	type SterilizerEquipmentModalProps,
	useSterilizerEquipmentForm,
} from "./sterilizerEquipment";

export type { SterilizerEquipmentModalProps };
export * from "./sterilizerEquipment";

export function SterilizerEquipmentModal({
	isOpen,
	onClose,
	onSuccess,
	editingEquipment = null,
}: SterilizerEquipmentModalProps) {
	const form = useSterilizerEquipmentForm(editingEquipment, isOpen, onSuccess, onClose);

	if (!isOpen || typeof document === "undefined") return null;

	const modalContent = (
		<div className="sanpin-modal-overlay">
			<div className="sanpin-modal" style={{ maxWidth: "780px", width: "min(780px, calc(100% - 32px))", maxHeight: "90vh", display: "flex", flexDirection: "column" }}>
				<div className="sanpin-modal-header" style={{ flexShrink: 0 }}>
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<div style={{ width: "36px", height: "36px", borderRadius: "8px", background: "rgba(13, 148, 136, 0.12)", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--teal-600, #0d9488)" }}>
							<Flame size={20} />
						</div>
						<div>
							<h3 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--ink, #0f172a)" }}>
								{form.isEditing ? `Редактирование стерилизатора: ${editingEquipment?.name}` : "Постановка на учет стерилизатора / автоклава"}
							</h3>
							<p style={{ margin: 0, fontSize: "0.75rem", color: "var(--muted, #64748b)" }}>
								Паспорт оборудования, метрологическая поверка и журнал СанПиН 257/у
							</p>
						</div>
					</div>
					<button type="button" onClick={onClose} className="sanpin-btn-icon" style={{ minHeight: "36px", minWidth: "36px" }} title="Закрыть окно">
						<X size={18} />
					</button>
				</div>

				{/* Segmented Tab Navigation */}
				<div style={{ padding: "0.5rem 1rem 0", display: "flex", gap: "0.35rem", borderBottom: "1px solid var(--line, #e2e8f0)", background: "var(--paper-soft, #f8fafc)" }}>
					{(
						[
							{ id: "passport", label: "Паспорт аппарата", icon: Flame },
							{ id: "cycles", label: "Журнал циклов (257/у)", icon: Clock },
							{ id: "maintenance", label: "ТО и поверка", icon: Wrench },
						] as const
					).map((t) => {
						const active = form.activeTab === t.id;
						const Icon = t.icon;
						return (
							<button
								key={t.id}
								type="button"
								onClick={() => form.setActiveTab(t.id)}
								className="sanpin-btn touch-manipulation"
								style={{ minHeight: "34px", padding: "0.3rem 0.75rem", fontSize: "0.78rem", fontWeight: active ? 700 : 500, background: active ? "var(--paper, #fff)" : "transparent", color: active ? "var(--teal-600, #0d9488)" : "var(--muted, #64748b)", border: active ? "1px solid var(--line, #e2e8f0)" : "1px solid transparent", borderBottom: active ? "2px solid var(--teal-600, #0d9488)" : "none", borderRadius: "6px 6px 0 0", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.3rem" }}
							>
								<Icon size={14} /> <span>{t.label}</span>
							</button>
						);
					})}
				</div>

				<form onSubmit={form.handleSubmit} style={{ overflowY: "auto", padding: "1rem", flex: 1, display: "flex", flexDirection: "column", gap: "1rem" }}>
					{form.activeTab === "passport" && (
						<SterilizerPassportCard formData={form.formData} onFieldChange={form.updateField} selectedPresetId={form.selectedPresetId} onApplyPreset={form.applyPreset} isEditing={form.isEditing} />
					)}
					{form.activeTab === "cycles" && (
						<SterilizerCycleLogsTable equipmentId={editingEquipment?.id} equipmentName={form.formData.name || form.formData.brandModel} deviceClass={form.formData.deviceClass} deviceType={form.formData.deviceType} />
					)}
					{form.activeTab === "maintenance" && (
						<SterilizerMaintenanceSchedule formData={form.formData} onFieldChange={form.updateField} isEditing={form.isEditing} submitting={form.submitting} onQuickMaintenance={form.handleQuickMaintenance} onQuickReturnToService={form.handleQuickReturnToService} onQuickDecommission={form.handleQuickDecommission} decommissionReason={form.decommissionReason} setDecommissionReason={form.setDecommissionReason} showDecommissionConfirm={form.showDecommissionConfirm} setShowDecommissionConfirm={form.setShowDecommissionConfirm} />
					)}
					<SterilizerModalFooterActions isEditing={form.isEditing} submitting={form.submitting} onClose={onClose} onQuickCycle={() => form.setActiveTab("cycles")} />
				</form>
			</div>
		</div>
	);

	return createPortal(modalContent, document.body);
}
