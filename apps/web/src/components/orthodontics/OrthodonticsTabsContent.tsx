/**
 * @dental/web/components/orthodontics/OrthodonticsTabsContent.tsx
 *
 * DENTE Dental CRM — Контент вкладок ортодонтической студии (Мандаты 8b, 8e, 8x).
 * Брекеты, элайнеры, фотопротокол, ТРГ и клинический дневник SOAP.
 */

import React from "react";
import { Check, Layers, ArrowRight, Copy, BookOpen, Camera, Activity } from "lucide-react";
import {
	ARCHWIRE_ALLOYS_SSOT, ARCHWIRE_SECTIONS_SSOT, ELASTICS_CATALOG,
	CHAIRSIDE_ACTIONS_CATALOG, ANGLE_CLASSES_CATALOG, ORTHO_PHOTO_SLOTS_SSOT,
	TRG_ANGLES_NORMS_SSOT, ORTHO_PATIENT_MEMO_SECTIONS, evaluateTrgAngleStatus,
	type ArchwireAlloy, type ArchwireSection, type OrthoProtocolState,
} from "./orthodonticsCatalogData";

export interface OrthodonticsTabsContentProps {
	readonly activeTab: "brackets" | "aligners" | "photo_trg" | "diary";
	readonly protocol: OrthoProtocolState;
	readonly setProtocol: React.Dispatch<React.SetStateAction<OrthoProtocolState>>;
	readonly selectedElasticSize: string;
	readonly setSelectedElasticSize: (val: string) => void;
	readonly handleToggleAction: (actionId: string) => void;
	readonly handleSyncUpperToLower: () => void;
	readonly handleAdvanceAlignerStep: () => void;
	readonly handleTogglePhotoSlot: (slotId: string) => void;
	readonly handleCopyText: (textToCopy: string, successMsg: string) => void;
	readonly soapSummary: string;
	readonly memoText: string;
	readonly onOpenPhotoModal: () => void;
	readonly onOpenCephModal: () => void;
}

export const OrthodonticsTabsContent: React.FC<OrthodonticsTabsContentProps> = ({
	activeTab,
	protocol,
	setProtocol,
	selectedElasticSize,
	setSelectedElasticSize,
	handleToggleAction,
	handleSyncUpperToLower,
	handleAdvanceAlignerStep,
	handleTogglePhotoSlot,
	handleCopyText,
	soapSummary,
	memoText,
	onOpenPhotoModal,
	onOpenCephModal,
}) => {
	const renderJawCard = (title: string, isUpper: boolean) => {
		const currentAlloy = isUpper ? protocol.upperAlloy : protocol.lowerAlloy;
		const currentSection = isUpper ? protocol.upperSection : protocol.lowerSection;
		const setAlloy = (a: ArchwireAlloy) => setProtocol((p) => (isUpper ? { ...p, upperAlloy: a } : { ...p, lowerAlloy: a }));
		const setSection = (s: ArchwireSection) => setProtocol((p) => (isUpper ? { ...p, upperSection: s } : { ...p, lowerSection: s }));

		return (
			<div className="ortho-card">
				<div className="flex items-center justify-between gap-2">
					<div className="flex items-center gap-2 min-w-0">
						<Layers className={`w-4 h-4 shrink-0 ${isUpper ? "text-[var(--teal,#0d9488)]" : "text-[var(--accent-glow,#38bdf8)]"}`} />
						<span className="text-sm font-semibold text-[var(--ink)]">{title}</span>
					</div>
					{isUpper && (
						<button
							type="button"
							onClick={handleSyncUpperToLower}
							className="px-2.5 py-1.5 text-[11px] font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--teal,#0d9488)] hover:border-[var(--teal,#0d9488)] flex items-center gap-1 whitespace-nowrap shrink-0 min-h-[36px] transition-colors cursor-pointer"
						>
							<span>Копировать на НЧ</span>
							<ArrowRight className="w-3 h-3 shrink-0" />
						</button>
					)}
				</div>
				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] font-medium text-[var(--ink-muted)]">Сплав дуги:</span>
					<div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
						{ARCHWIRE_ALLOYS_SSOT.map((alloy) => (
							<button key={alloy.key} type="button" onClick={() => setAlloy(alloy.key)} className={`ortho-touch-button ${currentAlloy === alloy.key ? "selected" : ""}`}>
								{alloy.shortRu}
							</button>
						))}
					</div>
				</div>
				<div className="flex flex-col gap-1.5">
					<span className="text-[11px] font-medium text-[var(--ink-muted)]">Сечение дуги:</span>
					<div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5">
						{ARCHWIRE_SECTIONS_SSOT.map((sec) => (
							<button key={sec.section} type="button" onClick={() => setSection(sec.section)} className={`ortho-touch-button ${currentSection === sec.section ? "selected" : ""}`}>
								{sec.dimensionRu}
							</button>
						))}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className="ortho-content-body">
			{activeTab === "brackets" && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					{renderJawCard("Верхняя челюсть (ВЧ)", true)}
					{renderJawCard("Нижняя челюсть (НЧ)", false)}
					<div className="ortho-card">
						<div className="flex items-center justify-between">
							<span className="text-sm font-semibold text-[var(--ink)]">Межчелюстные эластики</span>
							{protocol.selectedElasticId && (
								<button type="button" onClick={() => setProtocol((p) => ({ ...p, selectedElasticId: null }))} className="text-[11px] text-[var(--ink-muted)] hover:text-[var(--ink)]">Снять тяги</button>
							)}
						</div>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{ELASTICS_CATALOG.map((elastic) => {
								const isSelected = protocol.selectedElasticId === elastic.id;
								return (
									<button key={elastic.id} type="button" onClick={() => setProtocol((p) => ({ ...p, selectedElasticId: isSelected ? null : elastic.id }))} className={`min-h-[44px] p-2.5 rounded-lg border text-left transition-all flex flex-col gap-1 ${isSelected ? "border-[var(--teal,#0d9488)] bg-[var(--teal-subtle,rgba(13,148,136,0.15))] text-[var(--ink)] shadow-sm" : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper)]"}`}>
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold">{elastic.classNameRu}</span>
											<span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-[var(--line-subtle,#f1f5f9)]">{elastic.animalName}</span>
										</div>
										<div className="text-[11px] text-[var(--ink-muted)]">{elastic.forceOz} ({elastic.sizeInch})</div>
										<div className="text-[10px] text-[var(--teal,#0d9488)] font-medium">{elastic.hookSchemeRu}</div>
									</button>
								);
							})}
						</div>
						<div className="flex items-center gap-2 pt-2 border-t border-[var(--line)]">
							<span className="text-[11px] font-medium text-[var(--ink-muted)]">Калибр эластиков:</span>
							<select
								aria-label="Размер эластиков"
								value={selectedElasticSize}
								onChange={(e) => setSelectedElasticSize(e.target.value)}
								className="h-8 px-2 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] cursor-pointer"
							>
								<option value="3/16 Medium">3/16" Medium (Fox) 4.5 oz</option>
								<option value="1/4 Medium">1/4" Medium (Rabbit) 4.5 oz</option>
								<option value="5/16 Medium">5/16" Medium (Penguin) 4.5 oz</option>
								<option value="1/8 Heavy">1/8" Heavy (Chipmunk) 6.0 oz</option>
							</select>
						</div>
					</div>
					<div className="ortho-card">
						<span className="text-sm font-semibold text-[var(--ink)]">Манипуляции приёма</span>
						<div className="flex flex-wrap gap-1.5">
							{CHAIRSIDE_ACTIONS_CATALOG.map((action) => {
								const isChecked = protocol.selectedActionIds.includes(action.id);
								return (
									<button key={action.id} type="button" onClick={() => handleToggleAction(action.id)} className={`min-h-[44px] px-3 py-2 text-xs font-medium rounded-lg border transition-all flex items-center gap-2 ${isChecked ? "border-[var(--teal,#0d9488)] bg-[var(--teal-subtle,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)] font-semibold shadow-sm" : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper)]"}`}>
										<div className={`w-4 h-4 rounded flex items-center justify-center border ${isChecked ? "bg-[var(--teal,#0d9488)] border-[var(--teal,#0d9488)] text-white" : "border-[var(--line)] bg-[var(--paper)]"}`}>
											{isChecked && <Check className="w-3 h-3" />}
										</div>
										<span>{action.label}</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{activeTab === "aligners" && (
				<div className="flex flex-col gap-4">
					<div className="ortho-card">
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
							<div>
								<h4 className="text-sm font-bold text-[var(--ink)]">Контроль этапов элайнеров</h4>
								<p className="text-xs text-[var(--ink-muted)]">Шаг {protocol.alignerTracking.currentStep} из {protocol.alignerTracking.totalSteps} (смена каждые {protocol.alignerTracking.wearDaysPerStep} дней)</p>
							</div>
							<div className="flex items-center gap-2 flex-wrap">
								<div className="flex items-center gap-1.5 px-2 py-1 rounded-lg border border-[var(--line)] bg-[var(--paper-strong)]">
									<label htmlFor="ortho-current-step-input" className="text-xs text-[var(--ink-muted)] font-medium">Шаг:</label>
									<input
										id="ortho-current-step-input"
										type="number"
										min={0}
										max={protocol.alignerTracking.totalSteps}
										value={protocol.alignerTracking.currentStep}
										onChange={(e) => {
											const val = Math.min(protocol.alignerTracking.totalSteps, Math.max(0, parseInt(e.target.value, 10) || 0));
											setProtocol((p) => ({
												...p,
												alignerTracking: { ...p.alignerTracking, currentStep: val },
											}));
										}}
										className="w-12 text-xs font-bold text-center bg-transparent border-none outline-none text-[var(--ink)]"
									/>
									<span className="text-xs text-[var(--ink-muted)]">/ {protocol.alignerTracking.totalSteps}</span>
								</div>
								<button type="button" onClick={handleAdvanceAlignerStep} className="ortho-touch-button selected">
									+ Выдать следующий шаг
								</button>
							</div>
						</div>
						<div className="ortho-aligner-progress-bar">
							<div className="ortho-aligner-progress-fill" style={{ width: `${Math.round(((protocol.alignerTracking.currentStep || 0) / (protocol.alignerTracking.totalSteps || 24)) * 100)}%` }} />
						</div>
						<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
							<div className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col justify-between min-h-[56px]">
								<label htmlFor="ortho-issued-sets-input" className="text-[10px] text-[var(--ink-muted)] font-medium">Выдано комплектов</label>
								<div className="flex items-center gap-1.5 mt-0.5">
									<input
										id="ortho-issued-sets-input"
										type="number"
										min={1}
										max={protocol.alignerTracking.totalSteps}
										value={protocol.alignerTracking.issuedSetsCount || 1}
										onChange={(e) => {
											const val = Math.max(1, parseInt(e.target.value, 10) || 1);
											setProtocol((p) => ({
												...p,
												alignerTracking: { ...p.alignerTracking, issuedSetsCount: val },
											}));
										}}
										className="w-14 text-xs font-bold text-[var(--ink)] bg-[var(--paper)] border border-[var(--line)] rounded px-1.5 py-0.5 text-center"
									/>
									<span className="text-xs text-[var(--ink-muted)] font-medium">пар</span>
								</div>
							</div>
							<div className="p-2.5 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] flex flex-col justify-between min-h-[56px]">
								<label htmlFor="ortho-next-date-input" className="text-[10px] text-[var(--ink-muted)] font-medium">Плановая дата визита</label>
								<input
									id="ortho-next-date-input"
									data-testid="next-aligner-date-input"
									type="date"
									value={protocol.alignerTracking.nextPlannedDate}
									onChange={(e) => {
										const val = e.target.value;
										setProtocol((p) => ({
											...p,
											alignerTracking: { ...p.alignerTracking, nextPlannedDate: val },
										}));
									}}
									className="text-xs font-bold text-[var(--ink)] bg-transparent border-none outline-none p-0 cursor-pointer w-full mt-0.5"
								/>
							</div>
							<button
								type="button"
								data-testid="toggle-ipr-btn"
								onClick={() => setProtocol((p) => ({
									...p,
									alignerTracking: { ...p.alignerTracking, iprCompleted: !p.alignerTracking.iprCompleted },
								}))}
								className={`p-2.5 rounded-lg border text-left flex flex-col justify-between min-h-[56px] transition-all cursor-pointer ${
									protocol.alignerTracking.iprCompleted
										? "bg-[var(--teal-subtle,rgba(13,148,136,0.15))] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)]"
										: "bg-[var(--paper-strong)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper)]"
								}`}
							>
								<span className="text-[10px] text-[var(--ink-muted)] font-medium">Сепарация (IPR)</span>
								<span className="text-xs font-bold flex items-center justify-between w-full">
									<span>{protocol.alignerTracking.iprCompleted ? "Выполнена ✓" : "Не требуется"}</span>
									<span className="text-[10px] px-1 py-0.5 rounded bg-[var(--paper)] text-[var(--ink-muted)] font-normal border border-[var(--line)]">изменить</span>
								</span>
							</button>
							<button
								type="button"
								data-testid="toggle-attachments-btn"
								onClick={() => setProtocol((p) => ({
									...p,
									alignerTracking: { ...p.alignerTracking, attachmentsVerified: !p.alignerTracking.attachmentsVerified },
								}))}
								className={`p-2.5 rounded-lg border text-left flex flex-col justify-between min-h-[56px] transition-all cursor-pointer ${
									protocol.alignerTracking.attachmentsVerified
										? "bg-[var(--teal-subtle,rgba(13,148,136,0.15))] border-[var(--teal,#0d9488)] text-[var(--teal,#0d9488)]"
										: "bg-[var(--paper-strong)] border-[var(--line)] text-[var(--ink)] hover:bg-[var(--paper)]"
								}`}
							>
								<span className="text-[10px] text-[var(--ink-muted)] font-medium">Аттачменты</span>
								<span className="text-xs font-bold flex items-center justify-between w-full">
									<span>{protocol.alignerTracking.attachmentsVerified ? "В норме ✓" : "Требуется осмотр"}</span>
									<span className="text-[10px] px-1 py-0.5 rounded bg-[var(--paper)] text-[var(--ink-muted)] font-normal border border-[var(--line)]">изменить</span>
								</span>
							</button>
						</div>
					</div>
					<div className="ortho-card">
						<span className="text-sm font-semibold text-[var(--ink)]">Классификация прикуса по Энглю</span>
						<div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
							{ANGLE_CLASSES_CATALOG.map((ac) => {
								const isSelected = protocol.angleClass === ac.key;
								return (
									<button key={ac.key} type="button" onClick={() => setProtocol((p) => ({ ...p, angleClass: ac.key }))} className={`p-3 rounded-lg border text-left transition-all flex flex-col gap-1 min-h-[44px] ${isSelected ? "border-[var(--teal,#0d9488)] bg-[var(--teal-subtle,rgba(13,148,136,0.15))] text-[var(--ink)] shadow-sm" : "border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:bg-[var(--paper)]"}`}>
										<div className="text-xs font-bold">{ac.titleRu}</div>
										<div className="text-[11px] text-[var(--ink-muted)] leading-relaxed">{ac.descriptionRu}</div>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			)}

			{activeTab === "photo_trg" && (
				<div className="flex flex-col gap-4">
					<div className="ortho-card">
						<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
							<div>
								<h4 className="text-sm font-semibold text-[var(--ink)]">Клинический фотопротокол и ТРГ</h4>
								<p className="text-[11px] text-[var(--ink-muted)]">Связка со специализированными модулями фотопротокола и цефалометрии</p>
							</div>
							<div className="flex items-center gap-2 flex-wrap">
								<button
									type="button"
									onClick={onOpenPhotoModal}
									className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--teal,#0d9488)] bg-[var(--teal-subtle,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] hover:bg-[var(--teal,#0d9488)] hover:text-white transition-all flex items-center gap-1.5 min-h-[36px]"
								>
									<Camera className="w-3.5 h-3.5" />
									<span>Фотопротокол (8 проекций)</span>
								</button>
								<button
									type="button"
									onClick={onOpenCephModal}
									className="px-2.5 py-1.5 text-xs font-medium rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] hover:text-[var(--teal,#0d9488)] transition-all flex items-center gap-1.5 min-h-[36px]"
								>
									<Activity className="w-3.5 h-3.5 text-[var(--teal,#0d9488)]" />
									<span>Анализ ТРГ</span>
								</button>
							</div>
						</div>
						<div className="ortho-photo-grid pt-2">
							{ORTHO_PHOTO_SLOTS_SSOT.map((slot) => {
								const isVerified = Boolean(protocol.photoStatuses[slot.id]);
								return (
									<div key={slot.id} onClick={() => handleTogglePhotoSlot(slot.id)} className={`ortho-photo-card cursor-pointer ${isVerified ? "verified" : ""}`}>
										<div className="flex items-center justify-between">
											<span className="text-xs font-bold text-[var(--ink)]">{slot.titleRu}</span>
											<span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${isVerified ? "bg-[var(--teal-subtle,rgba(13,148,136,0.15))] text-[var(--teal,#0d9488)]" : "bg-[var(--line-subtle,#f1f5f9)] text-[var(--ink-muted)]"}`}>
												{isVerified ? "Зафиксировано" : "Ожидает"}
											</span>
										</div>
										<p className="text-[11px] text-[var(--ink-muted)] leading-tight">{slot.descriptionRu}</p>
									</div>
								);
							})}
						</div>
					</div>

					<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
						{TRG_ANGLES_NORMS_SSOT.map((norm) => {
							const currentVal = protocol.trgValues?.[norm.key] ?? norm.normDeg;
							const evaluation = evaluateTrgAngleStatus(norm.key, currentVal);
							return (
								<div key={norm.key} className="ortho-card">
									<div className="flex items-center justify-between">
										<span className="text-xs font-bold text-[var(--ink)]">{norm.symbol}</span>
										<span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${evaluation.status === "normal" ? "bg-[var(--teal-subtle,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)]" : "bg-[var(--warning-surface,rgba(245,158,11,0.1))] text-[var(--warning-ink,#f59e0b)]"}`}>
											{evaluation.badgeLabelRu}
										</span>
									</div>
									<div className="flex items-baseline gap-2">
										<span className="text-2xl font-extrabold text-[var(--ink)]">{currentVal}°</span>
										<span className="text-xs text-[var(--ink-muted)]">Норма: {norm.normDeg}° ± {norm.toleranceDeg}°</span>
									</div>
									<p className="text-[11px] text-[var(--ink-muted)] leading-tight">{norm.interpretationRu}</p>
								</div>
							);
						})}
					</div>
				</div>
			)}

			{activeTab === "diary" && (
				<div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
					<div className="ortho-card">
						<div className="flex items-center justify-between">
							<span className="text-sm font-semibold text-[var(--ink)]">Дневник приёма (SOAP)</span>
							<button type="button" onClick={() => handleCopyText(soapSummary, "Дневник скопирован в буфер")} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--teal,#0d9488)] hover:border-[var(--teal,#0d9488)] flex items-center gap-1 whitespace-nowrap min-h-[36px] transition-colors cursor-pointer">
								<Copy className="w-3.5 h-3.5" /> В медкарту
							</button>
						</div>
						<pre className="p-3 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-xs font-mono text-[var(--ink)] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{soapSummary}</pre>
					</div>

					<div className="ortho-card">
						<div className="flex items-center justify-between">
							<span className="text-sm font-semibold text-[var(--ink)]">Памятка пациенту</span>
							<button type="button" onClick={() => handleCopyText(memoText, "Памятка скопирована")} className="px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[var(--line)] bg-[var(--paper-strong)] text-[var(--teal,#0d9488)] hover:border-[var(--teal,#0d9488)] flex items-center gap-1 whitespace-nowrap min-h-[36px] transition-colors cursor-pointer">
								<BookOpen className="w-3.5 h-3.5" /> Копировать памятку
							</button>
						</div>
						<pre className="p-3 rounded-lg bg-[var(--paper-strong)] border border-[var(--line)] text-xs font-mono text-[var(--ink)] whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">{memoText}</pre>
					</div>
				</div>
			)}
		</div>
	);
};
