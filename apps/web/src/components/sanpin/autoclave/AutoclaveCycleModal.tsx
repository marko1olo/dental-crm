import React, { useState } from "react";
import { createPortal } from "react-dom";
import {
	X,
	Flame,
	Gauge,
	Clock,
	CheckCircle2,
	ShieldCheck,
	Tag,
	Sparkles,
} from "lucide-react";
import type { ClinicAutoclaveDevice } from "../AutoclaveEquipmentModal";
import { AutoclaveIndicatorControl, type IndicatorClassType } from "./AutoclaveIndicatorControl";
import { getPackagingLabel } from "./types";

export interface AutoclaveCycleModalProps {
	readonly isOpen: boolean;
	readonly onClose: () => void;
	readonly onSaveCycle?: (cycleData: {
		deviceId: string;
		deviceName: string;
		temperatureCelsius: number;
		pressureBar: number;
		durationMin: number;
		packagingType: string;
		itemsDescription: string;
		packsCount: number;
		indicatorType: string;
		passedIndicator: boolean;
		operatorName: string;
	}) => void;
	readonly clinicDevices: ClinicAutoclaveDevice[];
	readonly defaultOperatorName?: string;
}

export function AutoclaveCycleModal({
	isOpen,
	onClose,
	onSaveCycle,
	clinicDevices,
	defaultOperatorName = "Медсестра ЦСО",
}: AutoclaveCycleModalProps) {
	const [selectedDeviceId, setSelectedDeviceId] = useState<string>(
		clinicDevices[0]?.id || ""
	);
	const [regime, setRegime] = useState<"134" | "121">("134");
	const [packagingType, setPackagingType] = useState<string>("kraft_heat_sealed");
	const [itemsDescription, setItemsDescription] = useState<string>(
		"Хирургические и терапевтические наборы (лотки, элеваторы, наконечники)"
	);
	const [packsCount, setPacksCount] = useState<number>(10);
	const [indicatorType, setIndicatorType] = useState<IndicatorClassType>("class5_integrating");
	const [passedIndicator, setPassedIndicator] = useState<boolean>(true);
	const [operatorName, setOperatorName] = useState<string>(defaultOperatorName);

	if (!isOpen) return null;

	const handleSave = () => {
		const dev = clinicDevices.find((d) => d.id === selectedDeviceId) || clinicDevices[0];
		const temp = regime === "134" ? 134 : 121;
		const press = regime === "134" ? 2.1 : 1.1;
		const duration = regime === "134" ? 5 : 20;

		onSaveCycle?.({
			deviceId: dev?.id || "default",
			deviceName: dev ? dev.brandModelRu : "Автоклав B-класса",
			temperatureCelsius: temp,
			pressureBar: press,
			durationMin: duration,
			packagingType,
			itemsDescription,
			packsCount,
			indicatorType,
			passedIndicator,
			operatorName,
		});
		onClose();
	};

	const modalContent = (
		<div
			className="fixed inset-0 z-[1000] flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200"
			onClick={onClose}
			role="dialog"
			aria-modal="true"
			aria-label="Внесение цикла автоклавирования"
		>
			<div
				className="w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl bg-[var(--paper,#ffffff)] dark:bg-[var(--paper-strong,#0f172a)] border border-[var(--line,#e2e8f0)] dark:border-[#334155] shadow-2xl p-4 sm:p-6 flex flex-col gap-4 text-ink"
				onClick={(e) => e.stopPropagation()}
			>
				{/* Header */}
				<div className="flex items-center justify-between pb-3 border-b border-[var(--line,#e2e8f0)] dark:border-[#334155]">
					<div className="flex items-center gap-2">
						<div className="p-2 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-[var(--teal,#0d9488)]">
							<Sparkles size={20} />
						</div>
						<div>
							<h2 className="text-base sm:text-lg font-bold m-0 leading-tight">
								Внесение цикла стерилизации
							</h2>
							<p className="text-xs text-[var(--muted,#64748b)] m-0">
								СанПиН 3.3686-21 • Форма 257/у
							</p>
						</div>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-2 rounded-lg text-[var(--muted)] hover:text-ink cursor-pointer touch-manipulation min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
						aria-label="Закрыть"
					>
						<X size={20} />
					</button>
				</div>

				{/* Body */}
				<div className="flex flex-col gap-4">
					{/* 1. Device Selection */}
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-gray-200">
							Аппарат стерилизации
						</label>
						<select
							value={selectedDeviceId}
							onChange={(e) => setSelectedDeviceId(e.target.value)}
							className="sanpin-select w-full text-xs font-semibold rounded-xl p-2.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[44px]"
						>
							{clinicDevices.length === 0 ? (
								<option value="">Автоклав B-класса (По умолчанию)</option>
							) : (
								clinicDevices.map((d) => (
									<option key={d.id} value={d.id}>
										{d.brandModelRu} {d.serialNumber ? `(№${d.serialNumber})` : ""}
									</option>
								))
							)}
						</select>
					</div>

					{/* 2. Physical Regime Selector */}
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-gray-200">
							Параметры режима (T°, Давление, Время экспозиции)
						</label>
						<div className="grid grid-cols-2 gap-2">
							<button
								type="button"
								onClick={() => setRegime("134")}
								className={`p-3 rounded-xl border text-left transition-all touch-manipulation min-h-[48px] ${
									regime === "134"
										? "border-[var(--teal,#0d9488)] bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-[var(--teal,#0d9488)]/20"
										: "border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)]"
								}`}
							>
								<div className="flex items-center gap-1.5 font-bold text-xs text-ink">
									<Flame size={14} className="text-teal-600" />
									<span>134°C • 2.1 бар • 5 мин</span>
								</div>
								<span className="text-[11px] text-[var(--muted,#64748b)] block mt-0.5">
									Инструменты в упаковке (Стандарт)
								</span>
							</button>

							<button
								type="button"
								onClick={() => setRegime("121")}
								className={`p-3 rounded-xl border text-left transition-all touch-manipulation min-h-[48px] ${
									regime === "121"
										? "border-[var(--teal,#0d9488)] bg-teal-50/50 dark:bg-teal-950/30 ring-2 ring-[var(--teal,#0d9488)]/20"
										: "border-[var(--line,#e2e8f0)] dark:border-[#334155] bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)]"
								}`}
							>
								<div className="flex items-center gap-1.5 font-bold text-xs text-ink">
									<Clock size={14} className="text-sky-600" />
									<span>121°C • 1.1 бар • 20 мин</span>
								</div>
								<span className="text-[11px] text-[var(--muted,#64748b)] block mt-0.5">
									Пористые и деликатные изделия
								</span>
							</button>
						</div>
					</div>

					{/* 3. Items & Packaging */}
					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-gray-200">
								Вид упаковки
							</label>
							<select
								value={packagingType}
								onChange={(e) => setPackagingType(e.target.value)}
								className="sanpin-select w-full text-xs font-semibold rounded-xl p-2.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[44px]"
							>
								<option value="kraft_heat_sealed">{getPackagingLabel("kraft_heat_sealed")}</option>
								<option value="kraft_self_adhesive">{getPackagingLabel("kraft_self_adhesive")}</option>
								<option value="laminated_heat_sealed">{getPackagingLabel("laminated_heat_sealed")}</option>
								<option value="metal_cassette">{getPackagingLabel("metal_cassette")}</option>
								<option value="bix_filter">{getPackagingLabel("bix_filter")}</option>
							</select>
						</div>

						<div className="flex flex-col gap-1.5">
							<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-gray-200">
								Количество упаковок (шт.)
							</label>
							<input
								type="number"
								min={1}
								max={200}
								value={packsCount}
								onChange={(e) => setPacksCount(Number(e.target.value) || 1)}
								className="w-full text-xs font-semibold rounded-xl p-2.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[44px]"
							/>
						</div>
					</div>

					{/* 4. Items Description */}
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-gray-200">
							Стерилизуемые изделия
						</label>
						<input
							type="text"
							value={itemsDescription}
							onChange={(e) => setItemsDescription(e.target.value)}
							className="w-full text-xs font-medium rounded-xl p-2.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[44px]"
							placeholder="Наименования лотков, инструментов..."
						/>
					</div>

					{/* 5. Indicator Control */}
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-gray-200">
							Химический контроль стерилизации (Индикаторы)
						</label>
						<div className="flex gap-2 mb-2">
							{(["class5_integrating", "class6_emulating", "bowie_dick"] as const).map((t) => (
								<button
									key={t}
									type="button"
									onClick={() => setIndicatorType(t)}
									className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all touch-manipulation min-h-[36px] ${
										indicatorType === t
											? "bg-[var(--brand-primary,#2563eb)] text-white shadow-sm"
											: "bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] text-[var(--muted)] border border-[var(--line,#e2e8f0)] dark:border-[#334155]"
									}`}
								>
									{t === "class5_integrating" ? "Класс 5" : t === "class6_emulating" ? "Класс 6" : "Bowie-Dick"}
								</button>
							))}
						</div>
						<AutoclaveIndicatorControl
							indicatorType={indicatorType}
							passed={passedIndicator}
							onChange={(_, p) => setPassedIndicator(p)}
							showDetails={true}
						/>
					</div>

					{/* 6. Operator Name */}
					<div className="flex flex-col gap-1.5">
						<label className="text-xs font-bold text-[var(--ink,#0f172a)] dark:text-gray-200">
							Оператор / Ответственная медсестра ЦСО
						</label>
						<input
							type="text"
							value={operatorName}
							onChange={(e) => setOperatorName(e.target.value)}
							className="w-full text-xs font-medium rounded-xl p-2.5 bg-[var(--paper-soft,#f8fafc)] dark:bg-[var(--paper-strong,#1e293b)] border border-[var(--line,#cbd5e1)] dark:border-[#334155] min-h-[44px]"
							placeholder="ФИО сотрудника..."
						/>
					</div>
				</div>

				{/* Footer */}
				<div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--line,#e2e8f0)] dark:border-[#334155] mt-2">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2.5 rounded-xl text-xs font-semibold text-[var(--muted)] hover:text-ink min-h-[44px] touch-manipulation cursor-pointer"
					>
						Отмена
					</button>
					<button
						type="button"
						onClick={handleSave}
						className="px-5 py-2.5 rounded-xl text-xs font-bold bg-[var(--teal,#0d9488)] text-white hover:bg-teal-700 min-h-[44px] shadow-sm touch-manipulation cursor-pointer inline-flex items-center gap-1.5"
					>
						<CheckCircle2 size={16} />
						<span>Зафиксировать цикл</span>
					</button>
				</div>
			</div>
		</div>
	);

	if (typeof document === "undefined") return null;
	return createPortal(modalContent, document.body);
}
