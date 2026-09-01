/**
 * apps/web/src/components/treatment-plans/CuratorPlanAssignmentModal.tsx
 *
 * Модальное окно закрепления / смены куратора лечения за пациентом и планом (Фича #27).
 *  - Выбор куратора из списка сотрудников клиники
 *  - Установка этапа воронки куратора
 *  - Настройка персональной комиссии
 *  - Дата следующего контакта и заметки
 */

import React, { useState, useMemo } from "react";
import {
	type CuratorFunnelStage,
	type CuratorPlanAssignmentPayload,
	CURATOR_STAGE_DEFINITIONS,
	curatorPlanAssignmentPayloadSchema,
} from "@dental/shared";
import {
	AlertCircle,
	Calendar,
	Check,
	Coins,
	FileText,
	Layers,
	Percent,
	UserCheck,
	UserPlus,
	X,
} from "lucide-react";
import { showToast } from "../GlobalToast";
import { useAppLogicContext } from "../../contexts/AppLogicContext";
import { denteAdminSecretRequestHeaders } from "../../lib/denteRequestHeaders";

export interface CuratorPlanAssignmentModalProps {
	readonly isOpen: boolean;
	readonly patientId: string;
	readonly patientName: string;
	readonly treatmentPlanId: string;
	readonly treatmentPlanTitle: string;
	readonly currentCuratorId?: string | undefined;
	readonly currentCuratorName?: string | undefined;
	readonly currentStage?: CuratorFunnelStage | undefined;
	readonly onClose: () => void;
	readonly onAssigned?: ((payload: CuratorPlanAssignmentPayload) => void) | undefined;
}

export const CuratorPlanAssignmentModal: React.FC<CuratorPlanAssignmentModalProps> = ({
	isOpen,
	patientId,
	patientName,
	treatmentPlanId,
	treatmentPlanTitle,
	currentCuratorId,
	currentStage = "consultation",
	onClose,
	onAssigned,
}) => {
	const { dashboard } = useAppLogicContext();

	// Extract curators and managers from clinic staff
	const staffList = useMemo(() => {
		const staff = (dashboard?.clinicSettings?.staff ?? []) as any[];
		return staff.filter(
			(s) =>
				s.active &&
				(s.role === "curator" ||
					s.role === "administrator" ||
					s.role === "manager" ||
					s.role === "admin" ||
					s.role === "owner"),
		);
	}, [dashboard?.clinicSettings?.staff]);

	const [selectedCuratorId, setSelectedCuratorId] = useState<string>(
		currentCuratorId || staffList[0]?.id || "",
	);
	const [selectedStage, setSelectedStage] = useState<CuratorFunnelStage>(currentStage);
	const [useCustomCommission, setUseCustomCommission] = useState<boolean>(false);
	const [customCommissionPercent, setCustomCommissionPercent] = useState<number>(3.5);
	const [notes, setNotes] = useState<string>("");
	const [nextContactDate, setNextContactDate] = useState<string>(
		new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0] || "",
	);
	const [isSaving, setIsSaving] = useState<boolean>(false);

	if (!isOpen) return null;

	const selectedCurator = staffList.find((s) => s.id === selectedCuratorId);

	const handleSave = async () => {
		if (!selectedCuratorId) {
			showToast("Выберите куратора из списка сотрудников", "warning");
			return;
		}

		setIsSaving(true);
		try {
			const payload: CuratorPlanAssignmentPayload = {
				patientId,
				treatmentPlanId,
				curatorId: selectedCuratorId,
				curatorFullName: selectedCurator?.fullName || selectedCurator?.name || "Куратор клиники",
				initialStage: selectedStage,
				customCommissionPercent: useCustomCommission ? customCommissionPercent : null,
				notes: notes.trim() || null,
				nextContactDate: nextContactDate || null,
			};

			// Validate with Zod
			const parsed = curatorPlanAssignmentPayloadSchema.safeParse(payload);
			if (!parsed.success) {
				showToast(`Ошибка валидации: ${parsed.error.errors[0]?.message}`, "error");
				return;
			}

			// Save via API or local state
			try {
				await fetch(`/api/patients/${patientId}/administrative-profile`, {
					method: "PUT",
					headers: {
						"Content-Type": "application/json",
						...denteAdminSecretRequestHeaders(),
					},
					body: JSON.stringify({
						curatorId: payload.curatorId,
						curatorFullName: payload.curatorFullName,
						curatorAssignedAt: new Date().toISOString(),
						curatorFunnelStage: payload.initialStage,
						curatorCommissionPercent: payload.customCommissionPercent,
						curatorNotes: payload.notes,
					}),
				});
			} catch (err) {
				// Non-fatal if offline
			}

			showToast(`Куратор ${payload.curatorFullName} успешно закреплен за планом!`, "success");
			onAssigned?.(payload);
			onClose();
		} finally {
			setIsSaving(false);
		}
	};

	return (
		<div className="curator-modal-backdrop" onClick={onClose}>
			<div
				className="curator-modal-dialog"
				onClick={(e) => e.stopPropagation()}
				role="dialog"
				aria-modal="true"
			>
				{/* Заголовок */}
				<div className="curator-modal-header">
					<div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
						<div
							style={{
								width: "38px",
								height: "38px",
								borderRadius: "10px",
								backgroundColor: "rgba(99, 102, 241, 0.12)",
								color: "var(--accent, #6366f1)",
								display: "flex",
								alignItems: "center",
								justifyContent: "center",
							}}
						>
							<UserCheck className="w-5 h-5" />
						</div>
						<div>
							<h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>
								Закрепление куратора лечения
							</h3>
							<p style={{ margin: 0, fontSize: "12px", color: "var(--ink-muted, #64748b)" }}>
								{patientName} • {treatmentPlanTitle}
							</p>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="curator-pill-btn"
						style={{ minHeight: "36px", padding: "6px", borderRadius: "50%" }}
						aria-label="Закрыть"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				{/* Тело формы */}
				<div className="curator-modal-body">
					{/* 1. Выбор куратора */}
					<div className="curator-form-group">
						<label className="curator-form-label" htmlFor="curator-select">
							Ответственный куратор
						</label>
						<select
							id="curator-select"
							value={selectedCuratorId}
							onChange={(e) => setSelectedCuratorId(e.target.value)}
							className="curator-form-input"
						>
							{staffList.length === 0 ? (
								<option value="">Нет доступных сотрудников с ролью куратора</option>
							) : (
								staffList.map((s) => (
									<option key={s.id} value={s.id}>
										{s.fullName || s.name} ({s.role === "curator" ? "Куратор" : s.role})
									</option>
								))
							)}
						</select>
					</div>

					{/* 2. Этап воронки */}
					<div className="curator-form-group">
						<label className="curator-form-label" htmlFor="curator-stage">
							Текущий этап воронки согласования
						</label>
						<select
							id="curator-stage"
							value={selectedStage}
							onChange={(e: any) => setSelectedStage(e.target.value)}
							className="curator-form-input"
						>
							{CURATOR_STAGE_DEFINITIONS.map((def) => (
								<option key={def.stage} value={def.stage}>
									Этап {def.stepNumber}: {def.title}
								</option>
							))}
						</select>
					</div>

					{/* 3. Настройка сдельной комиссии */}
					<div className="curator-form-group">
						<div
							style={{
								display: "flex",
								alignItems: "center",
								justifyContent: "space-between",
								padding: "10px 14px",
								backgroundColor: "var(--paper, #f8fafc)",
								borderRadius: "10px",
								border: "1px solid var(--line, rgba(0,0,0,0.08))",
							}}
						>
							<div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
								<Coins className="w-4 h-4" style={{ color: "var(--teal, #0d9488)" }} />
								<span style={{ fontSize: "13px", fontWeight: 600 }}>
									Индивидуальный процент комиссии
								</span>
							</div>
							<label style={{ display: "flex", alignItems: "center", cursor: "pointer", gap: "6px" }}>
								<input
									type="checkbox"
									checked={useCustomCommission}
									onChange={(e) => setUseCustomCommission(e.target.checked)}
									style={{ width: "18px", height: "18px", cursor: "pointer" }}
								/>
								<span style={{ fontSize: "12px", color: "var(--ink-muted, #64748b)" }}>
									{useCustomCommission ? "Включен" : "По сетке клиники (2–5.5%)"}
								</span>
							</label>
						</div>

						{useCustomCommission && (
							<div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "8px" }}>
								<input
									type="number"
									min="0"
									max="100"
									step="0.1"
									value={customCommissionPercent}
									onChange={(e) => setCustomCommissionPercent(parseFloat(e.target.value) || 0)}
									className="curator-form-input"
									style={{ width: "120px" }}
								/>
								<span style={{ fontSize: "13px", color: "var(--ink-muted, #64748b)" }}>
									% от фактически оплаченной суммы плана
								</span>
							</div>
						)}
					</div>

					{/* 4. Дата следующего контакта */}
					<div className="curator-form-group">
						<label className="curator-form-label" htmlFor="curator-contact-date">
							Дата следующего контакта / звонка
						</label>
						<input
							id="curator-contact-date"
							type="date"
							value={nextContactDate}
							onChange={(e) => setNextContactDate(e.target.value)}
							className="curator-form-input"
						/>
					</div>

					{/* 5. Заметки куратора */}
					<div className="curator-form-group">
						<label className="curator-form-label" htmlFor="curator-notes">
							Комментарии и договоренности с пациентом
						</label>
						<textarea
							id="curator-notes"
							rows={3}
							value={notes}
							onChange={(e) => setNotes(e.target.value)}
							placeholder="Например: Пациент рассматривает рассрочку на 6 месяцев, ждет согласования графика отпусков..."
							className="curator-form-input"
							style={{ minHeight: "80px", resize: "vertical" }}
						/>
					</div>
				</div>

				{/* Подвал с кнопками действия (тач-таргеты >= 44px) */}
				<div className="curator-modal-footer">
					<button
						type="button"
						onClick={onClose}
						className="curator-action-btn curator-action-secondary"
						disabled={isSaving}
					>
						Отмена
					</button>

					<button
						type="button"
						onClick={handleSave}
						disabled={isSaving || !selectedCuratorId}
						className="curator-action-btn curator-action-primary"
					>
						<Check className="w-4 h-4" />
						{isSaving ? "Сохранение..." : "Закрепить куратора"}
					</button>
				</div>
			</div>
		</div>
	);
};
