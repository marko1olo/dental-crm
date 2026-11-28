/**
 * SurgeryProtocolSection.tsx — Секция хирургического протокола, честного выбора пациента/врача
 * из API и выбора зубов FDI (DENTE CRM). Мандаты 8b, 8e, 8z, 8am.
 */

import React, { useState } from "react";
import { Check, Search, ShieldCheck, Stethoscope, UserRound } from "lucide-react";
import type {
	MischBoneDensity,
	SurgeryCapType,
	SurgeryScenarioConfig,
	SurgeryScenarioType,
} from "./surgeryCatalogData";
import type { ToothImplantSpec } from "./SurgeryImplantParametersSection";
import { ImplantToothSpecsList } from "./ImplantToothSpecsList";
import type { SurgeryDoctorOption, SurgeryPatientOption } from "./useSurgeryHubState";

export const FREQUENT_SURGERY_TEETH = [16, 26, 36, 46, 11, 21, 14, 24, 34, 44, 18, 28, 38, 48] as const;

export interface SurgeryProtocolSectionProps {
	readonly activeScenario: SurgeryScenarioType;
	readonly scenarioConfig: SurgeryScenarioConfig;
	readonly onApplyPhysiologicalNorm: () => void;
	readonly apiLoadError?: string | null | undefined;
	readonly patientName: string;
	readonly isPatientBound: boolean;
	readonly doctorName: string;
	readonly isDoctorBound: boolean;
	readonly livePatients: readonly SurgeryPatientOption[];
	readonly liveDoctors: readonly SurgeryDoctorOption[];
	readonly isLoadingPatients: boolean;
	readonly isLoadingDoctors: boolean;
	readonly patientSearchQuery: string;
	readonly onChangePatientSearchQuery: (q: string) => void;
	readonly onSelectPatient: (patient: SurgeryPatientOption) => void;
	readonly onSelectDoctor: (doctor: SurgeryDoctorOption) => void;
	readonly anesthesiaProtocol?: string | undefined;
	readonly onChangeAnesthesiaProtocol?: ((val: string) => void) | undefined;
	readonly incisionProtocol?: string | undefined;
	readonly onChangeIncisionProtocol?: ((val: string) => void) | undefined;
	readonly boneBedProtocol?: string | undefined;
	readonly onChangeBoneBedProtocol?: ((val: string) => void) | undefined;
	readonly boneDensity: MischBoneDensity | "";
	readonly onSelectBoneDensity?: ((density: MischBoneDensity | "") => void) | undefined;
	readonly selectedBrand: string;
	readonly diameterMm: number;
	readonly lengthMm: number;
	readonly catalogArticle: string;
	readonly torqueNcm: number;
	readonly isqValue: number;
	readonly capType: SurgeryCapType;
	readonly selectedSuture: string;
	readonly selectedTeeth: readonly number[];
	readonly onSelectTooth: (t: number) => void;
	readonly activeEditingTooth: number;
	readonly onSelectActiveEditingTooth: (t: number) => void;
	readonly perToothSpecs: Readonly<Record<number, ToothImplantSpec>>;
	readonly getToothSpec: (tooth: number) => ToothImplantSpec;
	readonly onSelectBrand: (brand: string) => void;
	readonly onSelectDiameter: (d: number) => void;
	readonly onSelectLength: (l: number) => void;
	readonly onSelectTorque: (t: number) => void;
	readonly onSelectIsq: (isq: number) => void;
	readonly onSelectCapType: (cap: SurgeryCapType) => void;
	readonly lotNumber: string;
	readonly serialNumber: string;
	readonly onChangeLotNumber: (lot: string) => void;
	readonly onChangeSerialNumber: (sn: string) => void;
	readonly isGuidedSurgery: boolean;
	readonly onToggleGuidedSurgery: (val: boolean) => void;
	readonly guidedSleeveDiameterMm: number;
	readonly onSelectGuidedSleeveDiameter: (val: number) => void;
	readonly guidedSleeveOffsetMm: number;
	readonly onSelectGuidedSleeveOffset: (val: number) => void;
	readonly surgicalGuideTemplateId: string;
	readonly onChangeSurgicalGuideTemplateId: (val: string) => void;
}

export const SurgeryProtocolSection: React.FC<SurgeryProtocolSectionProps> = ({
	activeScenario,
	scenarioConfig,
	onApplyPhysiologicalNorm,
	apiLoadError,
	patientName,
	isPatientBound,
	doctorName,
	isDoctorBound,
	livePatients,
	liveDoctors,
	isLoadingPatients,
	isLoadingDoctors,
	patientSearchQuery,
	onChangePatientSearchQuery,
	onSelectPatient,
	onSelectDoctor,
	anesthesiaProtocol = "",
	onChangeAnesthesiaProtocol,
	incisionProtocol = "",
	onChangeIncisionProtocol,
	boneBedProtocol = "",
	onChangeBoneBedProtocol,
	boneDensity,
	onSelectBoneDensity,
	selectedBrand,
	diameterMm,
	lengthMm,
	catalogArticle,
	torqueNcm,
	isqValue,
	capType,
	selectedSuture,
	selectedTeeth,
	onSelectTooth,
	activeEditingTooth,
	onSelectActiveEditingTooth,
	perToothSpecs,
	getToothSpec,
	onSelectBrand,
	onSelectDiameter,
	onSelectLength,
	onSelectTorque,
	onSelectIsq,
	onSelectCapType,
	lotNumber,
	serialNumber,
	onChangeLotNumber,
	onChangeSerialNumber,
	isGuidedSurgery,
	onToggleGuidedSurgery,
	guidedSleeveDiameterMm,
	onSelectGuidedSleeveDiameter,
	guidedSleeveOffsetMm,
	onSelectGuidedSleeveOffset,
	surgicalGuideTemplateId,
	onChangeSurgicalGuideTemplateId,
}) => {
	const [isPickerExpanded, setIsPickerExpanded] = useState<boolean>(false);
	const showSelector = !isPatientBound || !isDoctorBound || isPickerExpanded;

	return (
		<div className="flex flex-col gap-4 min-h-0" data-testid="surgery-protocol-content">
			{apiLoadError && (
				<div
					role="alert"
					data-testid="surgery-api-error-banner"
					className="p-2.5 rounded-xl border border-[var(--danger-line,var(--danger))] bg-[var(--danger-soft)] text-xs text-[var(--danger-ink,var(--ink))]"
				>
					{apiLoadError}
				</div>
			)}
			{/* Честный селектор живого пациента и врача из API без фейковых заглушек */}
			{showSelector ? (
				<div
					className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper-soft)] flex flex-col gap-3"
					data-testid="surgery-context-selector"
				>
					<div className="flex items-center justify-between gap-2 flex-wrap">
						<span className="text-xs font-semibold text-[var(--ink)]">
							Пациент и оперирующий врач
						</span>
						{isPatientBound && isDoctorBound && (
							<button
								type="button"
								onClick={() => setIsPickerExpanded(false)}
								className="h-8 px-2.5 rounded-md text-xs font-medium border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer"
							>
								Свернуть
							</button>
						)}
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
						<div className="flex flex-col gap-1.5">
							<label className="text-xs text-[var(--ink-muted)] flex items-center gap-1.5">
								<UserRound className="w-3.5 h-3.5 shrink-0" />
								<span>Пациент: {isPatientBound ? patientName : "выберите из картотеки"}</span>
							</label>
							<div className="relative">
								<Search className="w-4 h-4 text-[var(--ink-muted)] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
								<input
									type="text"
									value={patientSearchQuery}
									onChange={(e) => onChangePatientSearchQuery(e.target.value)}
									placeholder="Поиск пациента по ФИО..."
									className="w-full min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 pl-9 pr-3 text-sm rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]"
									data-testid="surgery-patient-search-input"
								/>
							</div>
							<div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
								{isLoadingPatients ? (
									<span className="text-xs text-[var(--ink-muted)]">Загрузка пациентов...</span>
								) : livePatients.length === 0 ? (
									<span className="text-xs text-[var(--ink-muted)]">
										Пациенты не найдены
									</span>
								) : (
									livePatients.slice(0, 6).map((pat) => (
										<button
											key={pat.id}
											type="button"
											onClick={() => {
												onSelectPatient(pat);
												if (isDoctorBound) setIsPickerExpanded(false);
											}}
											className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-medium text-[var(--ink)] hover:border-[var(--primary)] cursor-pointer"
											data-testid={`surgery-select-patient-${pat.id}`}
										>
											{pat.fullName}
										</button>
									))
								)}
							</div>
						</div>

						<div className="flex flex-col gap-1.5">
							<label className="text-xs text-[var(--ink-muted)] flex items-center gap-1.5">
								<Stethoscope className="w-3.5 h-3.5 shrink-0" />
								<span>Врач: {isDoctorBound ? doctorName : "выберите хирурга"}</span>
							</label>
							<div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto">
								{isLoadingDoctors ? (
									<span className="text-xs text-[var(--ink-muted)]">Загрузка врачей...</span>
								) : liveDoctors.length === 0 ? (
									<span className="text-xs text-[var(--ink-muted)]">
										Список врачей недоступен
									</span>
								) : (
									liveDoctors.slice(0, 6).map((doc) => (
										<button
											key={doc.id}
											type="button"
											onClick={() => {
												onSelectDoctor(doc);
												if (isPatientBound) setIsPickerExpanded(false);
											}}
											className="min-h-[44px] sm:min-h-[32px] px-2.5 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-xs font-medium text-[var(--ink)] hover:border-[var(--primary)] cursor-pointer"
											data-testid={`surgery-select-doctor-${doc.id}`}
										>
											{doc.fullName}
										</button>
									))
								)}
							</div>
						</div>
					</div>
				</div>
			) : null}

			<div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-[var(--primary-soft,rgba(var(--primary-rgb),0.08))] border border-[var(--primary-soft,rgba(var(--primary-rgb),0.25))] gap-3">
				<div className="text-xs min-w-0">
					<div className="font-bold text-[var(--ink)] flex items-center gap-1.5">
						<ShieldCheck className="w-4 h-4 text-[var(--primary)] shrink-0" />
						<span>Экспресс-протокол: {scenarioConfig.titleRu}</span>
					</div>
					<div className="text-xs text-[var(--ink-muted)] leading-tight mt-0.5">
						{scenarioConfig.subtitleRu}
					</div>
				</div>
				<div className="flex flex-wrap items-center gap-2 shrink-0">
					{!showSelector && (
						<button
							type="button"
							onClick={() => setIsPickerExpanded(true)}
							className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3.5 text-xs font-semibold rounded-lg border border-[var(--line-strong,var(--line))] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] inline-flex items-center justify-center gap-1.5 cursor-pointer shrink-0 transition-colors"
							data-testid="btn-change-surgery-context"
						>
							Сменить пациента
						</button>
					)}
					<button
						type="button"
						onClick={onApplyPhysiologicalNorm}
						className="min-h-[44px] sm:min-h-[36px] h-11 sm:h-9 px-3.5 text-xs font-semibold rounded-lg border border-[var(--line-strong,var(--line))] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] cursor-pointer shrink-0 inline-flex items-center justify-center gap-1.5 transition-colors"
						data-testid="btn-standard-implant-protocol"
						id="btn-apply-physio-norm"
						title="Применить стандартный протокол операции без осложнений"
					>
						<Check className="w-4 h-4 text-[var(--primary)] shrink-0" />
						<span className="hidden sm:inline">Стандартная операция без осложнений</span>
						<span className="sm:hidden">Физиологическая норма</span>
					</button>
				</div>
			</div>

			{activeScenario === "implant" && (
				<div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs" data-testid="implant-protocol-phases">
					<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1">
						<label htmlFor="surgery-phase-anesthesia" className="text-xs font-medium text-[var(--ink-muted)]">1. Анестезия</label>
						<input
							id="surgery-phase-anesthesia"
							type="text"
							value={anesthesiaProtocol}
							onChange={(e) => onChangeAnesthesiaProtocol?.(e.target.value)}
							placeholder="Не указана"
							className="w-full h-7 px-2 text-xs font-medium rounded-md border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
							data-testid="input-surgery-anesthesia"
						/>
					</div>
					<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1">
						<label htmlFor="surgery-phase-incision" className="text-xs font-medium text-[var(--ink-muted)]">2. Разрез</label>
						<input
							id="surgery-phase-incision"
							type="text"
							value={incisionProtocol}
							onChange={(e) => onChangeIncisionProtocol?.(e.target.value)}
							placeholder="Не указан"
							className="w-full h-7 px-2 text-xs font-medium rounded-md border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
							data-testid="input-surgery-incision"
						/>
					</div>
					<div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col gap-1.5">
						<label htmlFor="surgery-phase-bed" className="text-xs font-medium text-[var(--ink-muted)]">3. Костное ложе</label>
						<div className="grid grid-cols-1 gap-1.5">
							<input
								id="surgery-phase-bed"
								type="text"
								value={boneBedProtocol}
								onChange={(e) => onChangeBoneBedProtocol?.(e.target.value)}
								placeholder="Препарирование ложа..."
								className="w-full h-8 sm:h-7 px-2 text-xs font-medium rounded-md border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
								data-testid="input-surgery-bone-bed"
							/>
							<select
								value={boneDensity}
								onChange={(e) => onSelectBoneDensity?.(e.target.value as MischBoneDensity | "")}
								aria-label="Плотность кости"
								data-testid="select-surgery-bone-density"
								className="w-full h-8 sm:h-7 px-1.5 text-xs sm:text-[11px] rounded-md border border-[var(--line)] bg-[var(--paper-soft)] text-[var(--ink)] focus:outline-none focus:border-[var(--primary)]"
							>
								<option value="">Плотность не выбрана</option>
								<option value="D1">Кость D1</option>
								<option value="D2">Кость D2</option>
								<option value="D3">Кость D3</option>
								<option value="D4">Кость D4</option>
							</select>
						</div>
					</div>
					<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between gap-1">
						<span className="text-xs font-medium text-[var(--ink-muted)]">4. Имплантат</span>
						<span className="font-semibold text-[var(--primary)] dark:text-[#5eead4] truncate">
							{selectedBrand
								? `${selectedBrand}${diameterMm > 0 && lengthMm > 0 ? ` Ø${diameterMm}×${lengthMm}` : ""}`
								: "Система не выбрана"}
						</span>
						<span className="text-xs font-mono text-[var(--ink-muted)] truncate">
							{catalogArticle || "Выберите систему ниже"}
						</span>
					</div>
					<div className="p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between gap-1">
						<span className="text-xs font-medium text-[var(--ink-muted)]">5. Торк и ISQ</span>
						<span className="font-semibold text-[var(--ink)] font-mono tabular-nums truncate">
							{torqueNcm > 0 || isqValue > 0
								? `${torqueNcm > 0 ? `${torqueNcm} Н·см` : "—"} · ISQ ${isqValue > 0 ? isqValue : "—"}`
								: "Не заданы"}
						</span>
						<span className="text-xs text-[var(--primary)] dark:text-[#5eead4]">
							{isqValue === 0 ? "Укажите параметры ниже" : isqValue >= 70 ? "зеленая зона" : isqValue >= 60 ? "допустимая зона" : "низкая стабильность"}
						</span>
					</div>
					<div className="col-span-2 sm:col-span-1 p-2.5 rounded-xl bg-[var(--paper)] border border-[var(--line)] flex flex-col justify-between gap-1">
						<span className="text-xs font-medium text-[var(--ink-muted)]">6. Ушивание</span>
						<span className="font-semibold text-[var(--ink)] truncate">
							{capType === "fdm" ? "ФДМ" : "Заглушка"}
						</span>
						<span className="text-xs text-[var(--ink-muted)] truncate">{selectedSuture || "Шовный материал не выбран"}</span>
					</div>
				</div>
			)}

			<div className="flex flex-col gap-1.5">
				<div className="text-xs font-bold text-[var(--ink)] flex items-center justify-between">
					<span>Зуб по формуле FDI:</span>
					{selectedTeeth.length > 1 && (
						<span className="text-xs font-semibold text-[var(--primary)]">
							{`Выбрано: ${selectedTeeth.join(", ")}`}
						</span>
					)}
				</div>
				<div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
					{FREQUENT_SURGERY_TEETH.map((t) => {
						const isSelected = selectedTeeth.includes(t);
						return (
							<button
								key={t}
								type="button"
								onClick={() => onSelectTooth(t)}
								className={`min-h-[44px] min-w-[44px] px-2 text-xs font-mono font-bold rounded-xl border transition-all cursor-pointer flex items-center justify-center ${
									isSelected
										? "bg-[var(--primary-soft,rgba(var(--primary-rgb),0.12))] text-[var(--primary)] border-[var(--primary)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:bg-[var(--paper-soft)]"
								}`}
								data-testid={`tooth-fdi-${t}`}
							>
								{t}
							</button>
						);
					})}
				</div>
			</div>

			{activeScenario === "implant" && (
				<ImplantToothSpecsList
					selectedTeeth={selectedTeeth}
					activeEditingTooth={activeEditingTooth}
					onSelectActiveTooth={onSelectActiveEditingTooth}
					perToothSpecs={perToothSpecs}
					getToothSpec={getToothSpec}
					selectedBrand={selectedBrand}
					onSelectBrand={onSelectBrand}
					diameterMm={diameterMm}
					onSelectDiameter={onSelectDiameter}
					lengthMm={lengthMm}
					onSelectLength={onSelectLength}
					torqueNcm={torqueNcm}
					onSelectTorque={onSelectTorque}
					isqValue={isqValue}
					onSelectIsq={onSelectIsq}
					capType={capType}
					onSelectCapType={onSelectCapType}
					catalogArticle={catalogArticle}
					lotNumber={lotNumber}
					serialNumber={serialNumber}
					onChangeLotNumber={onChangeLotNumber}
					onChangeSerialNumber={onChangeSerialNumber}
					isGuidedSurgery={isGuidedSurgery}
					onToggleGuidedSurgery={onToggleGuidedSurgery}
					guidedSleeveDiameterMm={guidedSleeveDiameterMm}
					onSelectGuidedSleeveDiameter={onSelectGuidedSleeveDiameter}
					guidedSleeveOffsetMm={guidedSleeveOffsetMm}
					onSelectGuidedSleeveOffset={onSelectGuidedSleeveOffset}
					surgicalGuideTemplateId={surgicalGuideTemplateId}
					onChangeSurgicalGuideTemplateId={onChangeSurgicalGuideTemplateId}
				/>
			)}

			<div className="p-3 rounded-xl border border-[var(--line)] bg-[var(--paper)] flex flex-col gap-2">
				<div className="text-xs font-bold text-[var(--ink)]">Расходные материалы к списанию:</div>
				<div className="flex flex-wrap gap-1.5">
					{scenarioConfig.standardMaterials.map((mat) => (
						<span
							key={mat.id}
							className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-[var(--paper-soft)] border border-[var(--line)] text-[var(--ink)]"
						>
							✓ {mat.name} ({mat.quantity} {mat.unit})
						</span>
					))}
				</div>
			</div>
		</div>
	);
};
