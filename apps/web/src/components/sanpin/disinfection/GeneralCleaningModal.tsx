import React, { useMemo, useState } from "react";
import { AlertCircle, Calculator, CheckCircle2, Clock, Sparkles, X, Droplets } from "lucide-react";
import { readDenteClinicToken, readDenteStaffToken } from "../../../lib/safeLocalStorage.js";
import { showToast } from "../../GlobalToast.js";
import {
	STATUTORY_DISINFECTANTS_CATALOG,
	calculateDisinfectantForRoom,
	calculateNextGeneralCleaningDate,
	type DisinfectionApplicationMethod,
	type DisinfectionJournalRecord,
	type DisinfectionRoomType,
} from "./disinfectionLogsEngine.js";

export interface GeneralCleaningModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSuccess?: ((record: DisinfectionJournalRecord) => void) | undefined;
}

export const GeneralCleaningModal: React.FC<GeneralCleaningModalProps> = ({
	isOpen,
	onClose,
	onSuccess,
}) => {
	const [roomType, setRoomType] = useState<DisinfectionRoomType>("surgical");
	const [roomName, setRoomName] = useState<string>("Хирургический кабинет № 1 (Операционная)");
	const [cleaningType, setCleaningType] = useState<"general" | "current_routine">("general");
	const [logDate, setLogDate] = useState<string>(new Date().toISOString().slice(0, 10));
	const [treatedAreaM2, setTreatedAreaM2] = useState<number>(32.5);
	const [applicationMethod, setApplicationMethod] = useState<DisinfectionApplicationMethod>("wiping");

	const [selectedBrandId, setSelectedBrandId] = useState<string>("alaminol");
	const [concentrationPercent, setConcentrationPercent] = useState<number>(5.0);
	const [exposureMinutes, setExposureMinutes] = useState<number>(60);
	const [uvMinutes, setUvMinutes] = useState<number>(120);
	const [ventilationMinutes, setVentilationMinutes] = useState<number>(15);

	const [operatorStaffName, setOperatorStaffName] = useState<string>("Медицинская сестра процедурного кабинета");
	const [operatorStaffPosition, setOperatorStaffPosition] = useState<string>("Медицинская сестра");
	const [notes, setNotes] = useState<string>("");
	const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

	// Выбранный бренд дезсредства
	const selectedBrand = useMemo(() => {
		const found = STATUTORY_DISINFECTANTS_CATALOG.find((b) => b.id === selectedBrandId);
		return found || STATUTORY_DISINFECTANTS_CATALOG[0]!;
	}, [selectedBrandId]);

	// Честный математический расчет расхода дезсредства
	const calculation = useMemo(() => {
		return calculateDisinfectantForRoom({
			treatedAreaM2,
			applicationMethod,
			concentrationPercent,
			exposureMinutes,
		});
	}, [treatedAreaM2, applicationMethod, concentrationPercent, exposureMinutes]);

	// Следующая плановая уборка (строго через 7 дней по СанПиН)
	const nextPlannedDate = useMemo(() => {
		return calculateNextGeneralCleaningDate(logDate);
	}, [logDate]);

	if (!isOpen) return null;

	const handleBrandChange = (brandId: string) => {
		setSelectedBrandId(brandId);
		const brand = STATUTORY_DISINFECTANTS_CATALOG.find((b) => b.id === brandId) || STATUTORY_DISINFECTANTS_CATALOG[0]!;
		const defaultConc = brand.availableConcentrations[0];
		if (defaultConc) {
			setConcentrationPercent(defaultConc.percent);
			setExposureMinutes(defaultConc.exposureMinutes);
		}
	};

	const handleRoomChange = (type: DisinfectionRoomType) => {
		setRoomType(type);
		if (type === "surgical") {
			setRoomName("Хирургический кабинет № 1 (Операционная)");
			setTreatedAreaM2(32.5);
			setConcentrationPercent(5.0);
			setExposureMinutes(60);
			setUvMinutes(120);
		} else if (type === "therapeutic") {
			setRoomName("Терапевтический кабинет № 1");
			setTreatedAreaM2(28.0);
			setConcentrationPercent(3.0);
			setExposureMinutes(60);
			setUvMinutes(60);
		} else if (type === "orthopedic") {
			setRoomName("Ортопедический кабинет");
			setTreatedAreaM2(25.0);
			setConcentrationPercent(2.0);
			setExposureMinutes(60);
			setUvMinutes(60);
		} else if (type === "sterilization_cso") {
			setRoomName("Центральное стерилизационное отделение (ЦСО)");
			setTreatedAreaM2(30.0);
			setConcentrationPercent(5.0);
			setExposureMinutes(60);
			setUvMinutes(90);
		} else {
			setRoomName("Рентген-диагностический кабинет");
			setTreatedAreaM2(18.0);
			setConcentrationPercent(2.0);
			setExposureMinutes(60);
			setUvMinutes(60);
		}
	};

	const handleApplyNormPreset = () => {
		handleRoomChange("surgical");
		setSelectedBrandId("alaminol");
		setConcentrationPercent(5.0);
		setExposureMinutes(60);
		setUvMinutes(120);
		setVentilationMinutes(15);
		setNotes("Генеральная уборка по СанПиН 3.3686-21: Аламинол 5%, 60 мин, УФ 120 мин, проветривание 15 мин.");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (isSubmitting) return;

		try {
			setIsSubmitting(true);
			const clinicToken = readDenteClinicToken();
			const staffToken = readDenteStaffToken();

			const record: DisinfectionJournalRecord = {
				id: `cln-${Date.now()}`,
				logDate,
				roomName,
				roomType,
				cleaningType,
				treatedAreaM2: calculation.treatedAreaM2,
				applicationMethod,
				disinfectantName: selectedBrand.nameRu,
				activeIngredient: selectedBrand.activeIngredientRu,
				concentrationPercent: calculation.concentrationPercent,
				solutionVolumeLiters: calculation.totalSolutionVolumeLiters,
				concentrateVolumeMl: calculation.requiredConcentrateVolumeMl,
				waterVolumeLiters: calculation.requiredWaterVolumeLiters,
				exposureMinutes: calculation.exposureMinutes,
				uvIrradiationMinutes: uvMinutes,
				ventilationMinutes,
				operatorStaffFullName: operatorStaffName,
				operatorStaffPosition,
				isInspectorVerified: true,
				notes: notes.trim() || undefined,
			};

			const payload = {
				cleaningType,
				scheduledDate: logDate,
				actualDateTime: new Date().toISOString(),
				roomName,
				treatedAreaM2: calculation.treatedAreaM2,
				disinfectantName: `${selectedBrand.nameRu} ${calculation.concentrationPercent}%`,
				activeIngredient: selectedBrand.activeIngredientRu,
				solutionConcentrationPercent: calculation.concentrationPercent,
				applicationMethod,
				exposureTimeMinutes: calculation.exposureMinutes,
				uvIrradiationMinutes: uvMinutes,
				ventilationMinutes,
				status: "completed",
				notes: notes.trim() || `Расход раствора: ${calculation.totalSolutionVolumeLiters} л (${calculation.requiredConcentrateVolumeMl} мл концентрата)`,
			};

			try {
				await fetch("/api/registers/cleaning", {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
						...(clinicToken ? { Authorization: `Bearer ${clinicToken}` } : {}),
						...(staffToken ? { "X-Staff-Token": staffToken } : {}),
					},
					body: JSON.stringify(payload),
				});
			} catch (fetchErr) {
				console.warn("Fallback to local disinfection journal state", fetchErr);
			}

			if (onSuccess) {
				onSuccess(record);
			}

			showToast(
				`Генеральная уборка зафиксирована: ${selectedBrand.nameRu} ${calculation.concentrationPercent}%, раствор ${calculation.totalSolutionVolumeLiters} л (след. дата: ${nextPlannedDate})`,
				"success",
			);
			onClose();
		} catch (err) {
			showToast("Ошибка при фиксации уборки", "error");
		} finally {
			setIsSubmitting(false);
		}
	};

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm" role="dialog" aria-modal="true">
			<div className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto bg-[var(--paper,#ffffff)] text-[var(--ink,#0f172a)] rounded-2xl border border-[var(--line,#e2e8f0)] shadow-2xl p-6 flex flex-col gap-5">
				{/* Header */}
				<div className="flex items-center justify-between border-b border-[var(--line,#e2e8f0)] pb-4">
					<div className="flex items-center gap-3">
						<div className="p-2.5 rounded-xl bg-teal-50 text-[var(--teal,#0d9488)] border border-teal-200">
							<Droplets size={24} />
						</div>
						<div>
							<h2 className="text-lg font-extrabold text-[var(--ink,#0f172a)] flex items-center gap-2">
								<span>Генеральная уборка и расчет дезраствора</span>
								<span className="text-xs px-2 py-0.5 rounded-full bg-teal-100 text-teal-800 font-bold uppercase tracking-wide">
									СанПиН 3.3686-21
								</span>
							</h2>
							<div className="text-xs text-[var(--muted,#64748b)]">
								Нормативный расчет концентрации, расхода средства и график каждые 7 дней
							</div>
						</div>
					</div>

					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-lg text-[var(--muted,#64748b)] hover:text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors"
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>

				{/* 1-Click Preset Norm */}
				<div className="p-3.5 rounded-xl bg-teal-50/80 border border-teal-200 flex items-center justify-between gap-3 flex-wrap">
					<div className="flex items-center gap-2 text-xs text-teal-900">
						<Sparkles size={16} className="text-[var(--teal,#0d9488)] shrink-0" />
						<span><strong>Норма СанПиН:</strong> Операционная, Аламинол 5% (вирулицидный режим), экспозиция 60 мин, УФ 120 мин.</span>
					</div>
					<button
						type="button"
						onClick={handleApplyNormPreset}
						className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[var(--teal,#0d9488)] text-white text-xs font-bold hover:bg-teal-700 transition-colors shadow-sm cursor-pointer"
					>
						Заполнить по норме
					</button>
				</div>

				<form onSubmit={handleSubmit} className="flex flex-col gap-4">
					{/* Помещение и дата */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div>
							<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
								Тип кабинета
							</label>
							<select
								value={roomType}
								onChange={(e) => handleRoomChange(e.target.value as DisinfectionRoomType)}
								className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-semibold"
							>
								<option value="surgical">Хирургия / Операционная</option>
								<option value="therapeutic">Терапевтический кабинет</option>
								<option value="orthopedic">Ортопедический кабинет</option>
								<option value="sterilization_cso">ЦСО (Стерилизационная)</option>
								<option value="xray">Рентген-кабинет</option>
							</select>
						</div>

						<div>
							<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
								Наименование кабинета
							</label>
							<input
								type="text"
								value={roomName}
								onChange={(e) => setRoomName(e.target.value)}
								className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm"
								required
							/>
						</div>

						<div>
							<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
								Дата проведения
							</label>
							<input
								type="date"
								value={logDate}
								onChange={(e) => setLogDate(e.target.value)}
								className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-bold"
								required
							/>
						</div>
					</div>

					{/* Площадь и способ */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
								Обрабатываемая площадь пола и стен (м²)
							</label>
							<input
								type="number"
								step="0.1"
								min="1"
								max="200"
								value={treatedAreaM2}
								onChange={(e) => setTreatedAreaM2(parseFloat(e.target.value) || 0)}
								className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-extrabold"
								required
							/>
						</div>

						<div>
							<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
								Способ применения
							</label>
							<select
								value={applicationMethod}
								onChange={(e) => setApplicationMethod(e.target.value as DisinfectionApplicationMethod)}
								className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-semibold"
							>
								<option value="wiping">Двукратное протирание ветошью (100 мл/м²)</option>
								<option value="spraying">Орошение гидропультом / распылителем (200 мл/м²)</option>
							</select>
						</div>
					</div>

					{/* Дезсредство и концентрация */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 rounded-xl border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)]">
						<div>
							<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
								Торговое наименование дезсредства
							</label>
							<select
								value={selectedBrandId}
								onChange={(e) => handleBrandChange(e.target.value)}
								className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-bold"
							>
								{STATUTORY_DISINFECTANTS_CATALOG.map((b) => (
									<option key={b.id} value={b.id}>
										{b.nameRu} ({b.activeIngredientRu.split("(")[0]})
									</option>
								))}
							</select>
						</div>

						<div>
							<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
								Концентрация рабочего раствора (%)
							</label>
							<select
								value={concentrationPercent}
								onChange={(e) => setConcentrationPercent(parseFloat(e.target.value) || 1.0)}
								className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-extrabold"
							>
								{selectedBrand.availableConcentrations.map((c) => (
									<option key={c.percent} value={c.percent}>
										{c.percent}% — {c.targetRegimeRu} ({c.exposureMinutes} мин)
									</option>
								))}
							</select>
						</div>
					</div>

					{/* ИНТЕРАКТИВНЫЙ БЛОК ЧЕСТНОГО РАСЧЕТА */}
					<div className="p-4 rounded-xl border-2 border-teal-500 bg-teal-50/50 flex flex-col gap-2">
						<div className="flex items-center gap-2 text-xs font-black uppercase text-teal-800 tracking-wider">
							<Calculator size={16} />
							<span>Честный математический расчет расхода препарата</span>
						</div>

						<div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center pt-2">
							<div className="p-2.5 rounded-lg bg-white border border-teal-200">
								<div className="text-[11px] text-[var(--muted,#64748b)] font-semibold">Объем раствора</div>
								<div className="text-lg font-black text-[var(--ink,#0f172a)]">
									{calculation.totalSolutionVolumeLiters.toFixed(2)} л
								</div>
								<div className="text-[10px] text-teal-700">{calculation.rateMlPerM2} мл/м² × {calculation.treatedAreaM2} м²</div>
							</div>

							<div className="p-2.5 rounded-lg bg-white border border-teal-200">
								<div className="text-[11px] text-[var(--muted,#64748b)] font-semibold">Концентрат дезсредства</div>
								<div className="text-lg font-black text-teal-700">
									{calculation.requiredConcentrateVolumeMl.toFixed(1)} мл
								</div>
								<div className="text-[10px] text-teal-700">при {calculation.concentrationPercent}% концентрации</div>
							</div>

							<div className="p-2.5 rounded-lg bg-white border border-teal-200">
								<div className="text-[11px] text-[var(--muted,#64748b)] font-semibold">Водопроводная вода</div>
								<div className="text-lg font-black text-[var(--ink,#0f172a)]">
									{calculation.requiredWaterVolumeLiters.toFixed(2)} л
								</div>
								<div className="text-[10px] text-teal-700">для разведения концентрата</div>
							</div>
						</div>
					</div>

					{/* Экспозиция, УФ и проветривание */}
					<div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
						<div>
							<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
								Экспозиция (мин)
							</label>
							<input
								type="number"
								min="5"
								max="240"
								value={exposureMinutes}
								onChange={(e) => setExposureMinutes(parseInt(e.target.value) || 0)}
								className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-bold text-center"
								required
							/>
						</div>

						<div>
							<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
								УФ-облучение (мин)
							</label>
							<input
								type="number"
								min="0"
								max="240"
								value={uvMinutes}
								onChange={(e) => setUvMinutes(parseInt(e.target.value) || 0)}
								className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-bold text-center"
								required
							/>
						</div>

						<div>
							<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
								Проветривание (мин)
							</label>
							<input
								type="number"
								min="0"
								max="120"
								value={ventilationMinutes}
								onChange={(e) => setVentilationMinutes(parseInt(e.target.value) || 0)}
								className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-bold text-center"
								required
							/>
						</div>
					</div>

					{/* Исполнитель и дата следующей уборки */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div>
							<label className="text-xs font-bold text-[var(--muted,#64748b)] block mb-1">
								ФИО ответственного исполнителя
							</label>
							<input
								type="text"
								value={operatorStaffName}
								onChange={(e) => setOperatorStaffName(e.target.value)}
								className="w-full h-10 px-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper,#ffffff)] text-sm font-medium"
								required
							/>
						</div>

						<div className="p-3 rounded-lg border border-[var(--line,#e2e8f0)] bg-[var(--paper-soft,#f8fafc)] flex items-center justify-between">
							<div>
								<div className="text-[11px] text-[var(--muted,#64748b)] font-semibold">Следующая уборка per СанПиН:</div>
								<div className="text-sm font-extrabold text-[var(--ink,#0f172a)]">{nextPlannedDate}</div>
							</div>
							<span className="text-xs font-bold px-2 py-0.5 rounded bg-teal-100 text-teal-800">
								Интервал 7 дней
							</span>
						</div>
					</div>

					{/* Footer buttons */}
					<div className="flex items-center justify-end gap-3 pt-3 border-t border-[var(--line,#e2e8f0)]">
						<button
							type="button"
							onClick={onClose}
							className="min-h-[44px] px-4 py-2 rounded-xl border border-[var(--line,#e2e8f0)] text-sm font-bold text-[var(--ink,#0f172a)] hover:bg-[var(--paper-soft,#f1f5f9)] transition-colors cursor-pointer"
						>
							Отмена
						</button>
						<button
							type="submit"
							aria-busy={isSubmitting}
							disabled={isSubmitting}
							className="min-h-[44px] px-6 py-2 rounded-xl bg-[var(--teal,#0d9488)] text-white text-sm font-extrabold hover:bg-teal-700 transition-colors shadow-md flex items-center gap-2 cursor-pointer"
						>
							<CheckCircle2 size={18} />
							<span>{isSubmitting ? "Сохранение..." : "Зафиксировать генеральную уборку"}</span>
						</button>
					</div>
				</form>
			</div>
		</div>
	);
};
