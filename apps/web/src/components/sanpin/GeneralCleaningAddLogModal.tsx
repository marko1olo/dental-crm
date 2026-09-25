import {
	type CleaningApplicationMethod,
	type CleaningType,
	type CreateGeneralCleaningLogDto,
} from "@dental/shared";
import { Sparkles, X } from "lucide-react";
import React, { useState } from "react";
import { readDenteClinicToken, readDenteStaffToken } from "../../lib/safeLocalStorage";
import { showToast } from "../GlobalToast";

export interface GeneralCleaningAddLogModalProps {
	isOpen: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

export function GeneralCleaningAddLogModal({
	isOpen,
	onClose,
	onSuccess,
}: GeneralCleaningAddLogModalProps) {
	const [formCleaningType, setFormCleaningType] = useState<CleaningType>("general");
	const [formScheduledDate, setFormScheduledDate] = useState(new Date().toISOString().slice(0, 10));
	const [formActualDateTime, setFormActualDateTime] = useState(new Date().toISOString().slice(0, 16));
	const [formRoomName, setFormRoomName] = useState("Операционная / Хирургический кабинет");
	const [formAreaM2, setFormAreaM2] = useState<number>(32.5);
	const [formDisinfectant, setFormDisinfectant] = useState("Аламинол 1.5%");
	const [formActiveIngredient, setFormActiveIngredient] = useState("ЧАС (алкилдиметилбензиламмоний хлорид) + Глутаровый альдегид");
	const [formConcentration, setFormConcentration] = useState<number>(1.5);
	const [formAppMethod, setFormAppMethod] = useState<CleaningApplicationMethod>("wiping");
	const [formExposureMin, setFormExposureMin] = useState<number>(60);
	const [formUvMin, setFormUvMin] = useState<number>(60);
	const [formVentilationMin, setFormVentilationMin] = useState<number>(15);
	const [formNotes, setFormNotes] = useState("");
	const [submitting, setSubmitting] = useState(false);

	if (!isOpen) return null;

	const handleApplySanpinNormPreset = () => {
		setFormCleaningType("general");
		setFormScheduledDate(new Date().toISOString().slice(0, 10));
		setFormActualDateTime(new Date().toISOString().slice(0, 16));
		setFormRoomName("Операционная / Хирургический кабинет №1");
		setFormAreaM2(32.5);
		setFormDisinfectant("Аламинол 5%");
		setFormActiveIngredient("ЧАС + Глутаровый альдегид");
		setFormConcentration(5.0);
		setFormAppMethod("wiping");
		setFormExposureMin(60);
		setFormUvMin(120);
		setFormVentilationMin(15);
		setFormNotes("Уборка по графику выполнена: Дезсредство Аламинол 5%, экспозиция 60 мин, УФ 120 мин, проветривание 15 мин.");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submitting) return;
		try {
			setSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const payload: CreateGeneralCleaningLogDto = {
				cleaningType: formCleaningType,
				scheduledDate: formScheduledDate,
				actualDateTime: new Date(formActualDateTime).toISOString(),
				roomName: formRoomName,
				treatedAreaM2: Number(formAreaM2),
				disinfectantName: formDisinfectant,
				activeIngredient: formActiveIngredient || undefined,
				solutionConcentrationPercent: Number(formConcentration),
				applicationMethod: formAppMethod,
				exposureTimeMinutes: Number(formExposureMin),
				uvIrradiationMinutes: Number(formUvMin),
				ventilationMinutes: Number(formVentilationMin),
				status: "completed",
				notes: formNotes || undefined,
			};

			const res = await fetch("/api/registers/cleaning", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
					...(staffToken ? { "X-Staff-Token": staffToken } : {}),
				},
				body: JSON.stringify(payload),
			});

			if (res.ok) {
				showToast("Генеральная уборка успешно внесена в журнал", "success");
				onSuccess();
				onClose();
			} else {
				const err = await res.json().catch(() => ({}));
				showToast(err.message || "Ошибка при сохранении", "error");
			}
		} catch (err) {
			showToast("Сетевая ошибка при сохранении", "error");
		} finally {
			setSubmitting(false);
		}
	};

	return (
		<div className="sanpin-modal-overlay">
			<div className="sanpin-modal">
				<div className="sanpin-modal-header">
					<h3>Проведение генеральной уборки (СанПиН 3.3686-21)</h3>
					<button
						type="button"
						onClick={onClose}
						style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", color: "var(--muted)" }}
						aria-label="Закрыть"
					>
						<X size={18} />
					</button>
				</div>
				<form onSubmit={handleSubmit}>
					<div className="sanpin-modal-body">
						<div style={{ marginBottom: "0.75rem", display: "flex", justifyContent: "flex-end" }}>
							<button
								type="button"
								onClick={handleApplySanpinNormPreset}
								className="sanpin-btn sanpin-btn-secondary"
								style={{ fontSize: "0.78rem", padding: "0.3rem 0.6rem" }}
							>
								<Sparkles size={13} /> Заполнить норму СанПиН (Аламинол 5%, УФ 120 мин)
							</button>
						</div>
						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Вид уборки</label>
								<select
									value={formCleaningType}
									onChange={(e) => setFormCleaningType(e.target.value as CleaningType)}
									className="sanpin-select"
								>
									<option value="general">Генеральная уборка (по графику, 1 раз в 7 дней)</option>
									<option value="current_routine">Текущая заключительная дезинфекция</option>
								</select>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Помещение / Кабинет</label>
								<input
									type="text"
									required
									value={formRoomName}
									onChange={(e) => setFormRoomName(e.target.value)}
									className="sanpin-input"
									placeholder="Операционная / Кабинет терапии / ЦСО"
								/>
							</div>
						</div>

						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Плановая дата</label>
								<input
									type="date"
									required
									value={formScheduledDate}
									onChange={(e) => setFormScheduledDate(e.target.value)}
									className="sanpin-input"
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Фактическая дата и время</label>
								<input
									type="datetime-local"
									required
									value={formActualDateTime}
									onChange={(e) => setFormActualDateTime(e.target.value)}
									className="sanpin-input"
								/>
							</div>
						</div>

						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Обработанная площадь (м²)</label>
								<input
									type="number"
									step="0.1"
									required
									value={formAreaM2}
									onChange={(e) => setFormAreaM2(parseFloat(e.target.value) || 0)}
									className="sanpin-input"
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Способ применения</label>
								<select
									value={formAppMethod}
									onChange={(e) => setFormAppMethod(e.target.value as CleaningApplicationMethod)}
									className="sanpin-select"
								>
									<option value="wiping">Двукратное протирание ветошью</option>
									<option value="spraying">Орошение (распыление)</option>
									<option value="combined">Комбинированный</option>
								</select>
							</div>
						</div>

						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Торговое наименование дезсредства</label>
								<input
									type="text"
									required
									value={formDisinfectant}
									onChange={(e) => setFormDisinfectant(e.target.value)}
									className="sanpin-input"
									placeholder="Аламинол / Септолит / Бриллиант"
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Концентрация раствора (%)</label>
								<input
									type="number"
									step="0.1"
									required
									value={formConcentration}
									onChange={(e) => setFormConcentration(parseFloat(e.target.value) || 0)}
									className="sanpin-input"
								/>
							</div>
						</div>

						<div className="sanpin-form-row">
							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Экспозиция (мин)</label>
								<input
									type="number"
									required
									value={formExposureMin}
									onChange={(e) => setFormExposureMin(parseInt(e.target.value) || 0)}
									className="sanpin-input"
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">УФ-облучение (мин)</label>
								<input
									type="number"
									required
									value={formUvMin}
									onChange={(e) => setFormUvMin(parseInt(e.target.value) || 0)}
									className="sanpin-input"
								/>
							</div>

							<div className="sanpin-form-group">
								<label className="sanpin-form-label">Проветривание (мин)</label>
								<input
									type="number"
									required
									value={formVentilationMin}
									onChange={(e) => setFormVentilationMin(parseInt(e.target.value) || 0)}
									className="sanpin-input"
								/>
							</div>
						</div>
					</div>
					<div className="sanpin-modal-footer">
						<button type="button" onClick={onClose} className="sanpin-btn sanpin-btn-secondary">
							Отмена
						</button>
						<button
							type="submit"
							aria-busy={submitting}
							style={{ opacity: submitting ? 0.7 : 1 }}
							className="sanpin-btn sanpin-btn-primary"
						>
							Зафиксировать уборку
						</button>
					</div>
				</form>
			</div>
		</div>
	);
}
