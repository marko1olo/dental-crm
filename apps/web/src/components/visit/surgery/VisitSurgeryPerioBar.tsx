import React, { useState, useCallback } from "react";
import { Zap, Activity, MessageSquare, SlidersHorizontal, CheckCircle2, ShieldAlert } from "lucide-react";
import type { SurgicalServiceItem, SurgicalOperationNorm } from "../../surgery/surgeryCatalogData";
import { getSurgicalCatalogServices, dispatchSurgicalServicesToInvoice } from "../../surgery/surgeryCatalogData";
import { MobileBottomSheet } from "../../mobile/MobileBottomSheet";
import { triggerHaptic } from "../../../native/mobileBridge";
import { showToast } from "../../GlobalToast";

export interface VisitSurgeryPerioBarProps {
	readonly effectiveTooth: number;
	readonly norm: SurgicalOperationNorm;
	readonly onApplyProtocolText: (text: string) => void;
	readonly onAddToInvoice?: ((services: readonly SurgicalServiceItem[]) => void) | undefined;
}

const SOFT_TISSUE_TECHNIQUES = [
	{ id: "fgg", label: "СДТ с нёба (FGG)", short: "СДТ" },
	{ id: "ctg", label: "ССТ субэпителиальный (CTG)", short: "ССТ" },
	{ id: "caf", label: "CAF по Зуккелли", short: "CAF" },
	{ id: "tunnel", label: "Туннельная пластика", short: "Туннель" },
	{ id: "flap", label: "Лоскутная операция / кюретаж", short: "Лоскут" },
] as const;

const PERIO_SUTURE_OPTIONS = [
	"Prolene 6-0",
	"Prolene 7-0",
	"ПГА 5-0",
	"Викрил 5-0",
] as const;

export const VisitSurgeryPerioBar: React.FC<VisitSurgeryPerioBarProps> = ({
	effectiveTooth,
	norm,
	onApplyProtocolText,
	onAddToInvoice,
}) => {
	const isEmergency = norm.category === "emergency";
	const [selectedTechnique, setSelectedTechnique] = useState<string>(
		norm.id.includes("ctg")
			? "ctg"
			: norm.id.includes("fgg")
				? "fgg"
				: norm.id.includes("caf")
					? "caf"
					: norm.id.includes("tunnel")
						? "tunnel"
						: "flap",
	);
	const [selectedSuture, setSelectedSuture] = useState<string>("Prolene 6-0");
	const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
	const [isRubberDrainActive, setIsRubberDrainActive] = useState<boolean>(true);

	const handleApplyUncomplicatedNorm = useCallback(() => {
		triggerHaptic("success");
		onApplyProtocolText(norm.standardProtocolTextRu);
		showToast(
			isEmergency
				? "✓ Норма периостотомии: дренаж установлен, экссудат эвакуирован, гемостаз полный"
				: `✓ Физиологическая норма: ${norm.shortBadge}, швы ${selectedSuture} без натяжения, гемостаз полный`,
			"success",
		);
	}, [isEmergency, norm, onApplyProtocolText, selectedSuture]);

	const handleAddServicesToInvoice = useCallback(() => {
		triggerHaptic("selection");
		const services = getSurgicalCatalogServices(norm, effectiveTooth);
		dispatchSurgicalServicesToInvoice({
			norm,
			toothFdi: effectiveTooth,
			customServices: services,
			onAddToInvoice,
		});
		showToast(`Услуги «${norm.title}» добавлены в смету`, "success");
	}, [effectiveTooth, norm, onAddToInvoice]);

	const handleCopyPatientMemo = useCallback(() => {
		triggerHaptic("selection");
		const toothStr = `область зуба FDI #${effectiveTooth}`;
		const memo = isEmergency
			? `ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ ПЕРИОСТОТОМИИ (${toothStr})\n\n` +
				"1. ДРЕНАЖ: В ране установлен резиновый выпускник. Не вытягивать и не трогать языком!\n" +
				"2. НЕ ГРЕТЬ ЩЕКУ: Категорически запрещены грелки, компрессы, бани и горячая ванна.\n" +
				"3. РОТОВЫЕ ВАННОЧКИ: С хлоргексидином 0.05% или Мирамистином 4-5 раз в день.\n" +
				"4. ХОЛОД: Сухой холод к щеке на 15 минут каждые 2 часа в первый день.\n" +
				"5. ЯВКА: Обязательный осмотр завтра для ревизии раны и смены дренажа."
			: `ПАМЯТКА ПАЦИЕНТУ ПОСЛЕ ПЛАСТИКИ ДЕСНЫ / МЯГКИХ ТКАНЕЙ (${toothStr})\n\n` +
				"1. ПОКОЙ ДЕСНЫ: Категорически не оттягивать губу и не трогать языком оперированную зону.\n" +
				"2. ГИГИЕНА: Не чистить оперированные зубы жесткой щеткой 14 дней. Пассивные ванночки с 0.05% хлоргексидином.\n" +
				"3. ДИЕТА: Мягкая протертая пища комфортной температуры, исключить острое и соленое.\n" +
				"4. ХОЛОД: Сухой холод в первые сутки на 15 мин с перерывами 30 мин.\n" +
				"5. ШВЫ: Наложен микрохирургический шов. Снятие швов через 12–14 дней.";

		if (typeof navigator !== "undefined" && navigator.clipboard?.writeText) {
			void navigator.clipboard.writeText(memo);
			showToast("Памятка пациенту скопирована в буфер обмена", "success");
		}
	}, [effectiveTooth, isEmergency]);

	const renderControls = () => (
		<div className="space-y-3 text-xs">
			{isEmergency ? (
				<div className="space-y-1.5" data-testid="emergency-controls">
					<span className="text-[11px] font-bold text-[var(--muted)]">Экстренная тактика и дренирование:</span>
					<div className="flex items-center gap-2 flex-wrap">
						<button
							type="button"
							onClick={() => setIsRubberDrainActive(!isRubberDrainActive)}
							className={`min-h-[44px] px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1.5 ${
								isRubberDrainActive
									? "bg-[var(--primary)] text-white shadow-xs"
									: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]"
							}`}
							data-testid="btn-toggle-rubber-drain"
						>
							{isRubberDrainActive && <CheckCircle2 size={13} className="shrink-0" />}
							<span>Резиновый ленточный выпускник (дренаж)</span>
						</button>
						<span className="text-[11px] text-[var(--muted)]">Антисептическая обработка хлоргексидином 0.05%</span>
					</div>
				</div>
			) : (
				<div className="space-y-2" data-testid="perio-technique-controls">
					<div className="space-y-1.5">
						<span className="text-[11px] font-bold text-[var(--muted)]">Методика пластики мягких тканей:</span>
						<div className="flex items-center gap-2 flex-wrap" role="toolbar" aria-label="Методики пластики десны">
							{SOFT_TISSUE_TECHNIQUES.map((tech) => {
								const isSel = selectedTechnique === tech.id;
								return (
									<button
										key={tech.id}
										type="button"
										onClick={() => setSelectedTechnique(tech.id)}
										className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1.5 ${
											isSel
												? "bg-[var(--primary)] text-white shadow-xs"
												: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--primary)]"
										}`}
										data-testid={`btn-technique-${tech.id}`}
									>
										{isSel && <CheckCircle2 size={13} className="shrink-0" />}
										<span>{tech.label}</span>
									</button>
								);
							})}
						</div>
					</div>

					<div className="space-y-1.5">
						<span className="text-[11px] font-bold text-[var(--muted)]">Микрохирургический шовный материал:</span>
						<div className="flex items-center gap-2 flex-wrap">
							{PERIO_SUTURE_OPTIONS.map((sut) => {
								const isSel = selectedSuture === sut;
								return (
									<button
										key={sut}
										type="button"
										onClick={() => setSelectedSuture(sut)}
										className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1.5 ${
											isSel
												? "bg-[var(--primary)] text-white shadow-xs"
												: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--primary)]"
										}`}
										data-testid={`btn-suture-${sut.replace(/\s+/g, "_")}`}
									>
										{isSel && <CheckCircle2 size={13} className="shrink-0" />}
										<span>{sut}</span>
									</button>
								);
							})}
						</div>
					</div>
				</div>
			)}
		</div>
	);

	return (
		<div
			className="p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3 overflow-x-clip max-w-full"
			data-testid="visit-surgery-perio-bar"
		>
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-bold text-[var(--primary)]">
					{isEmergency ? <ShieldAlert size={16} /> : <Activity size={16} />}
					<span>{isEmergency ? "Экстренная хирургическая помощь:" : "Пародонтальная хирургия и пластика мягких тканей:"}</span>
					<span className="px-2 py-0.5 rounded-md bg-[var(--paper)] border border-[var(--line)] text-[11px] font-semibold text-[var(--ink)]">
						{norm.shortBadge}
					</span>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={() => {
							triggerHaptic("selection");
							setIsMobileSheetOpen(true);
						}}
						className="sm:hidden min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--primary)] bg-[var(--paper)] text-[var(--primary)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 cursor-pointer touch-manipulation"
						data-testid="btn-open-perio-mobile-sheet"
						title="Открыть параметры операции в шторке"
					>
						<SlidersHorizontal size={14} />
						<span>Параметры</span>
					</button>

					<button
						type="button"
						onClick={handleApplyUncomplicatedNorm}
						className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-bold bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] flex items-center gap-2 cursor-pointer shadow-xs transition-all touch-manipulation"
						data-testid="btn-uncomplicated-perio-norm"
						title={
							isEmergency
								? "Норма периостотомии: дренаж установлен, гемостаз полный"
								: "Физиологическая норма: протокол применен, швы наложены, гемостаз полный"
						}
					>
						<Zap size={14} className="shrink-0" />
						<span>
							{isEmergency
								? "Норма периостотомии: дренаж установлен, гемостаз полный"
								: "Норма операции: лоскут адаптирован, швы без натяжения, гемостаз полный"}
						</span>
					</button>

					<button
						type="button"
						onClick={handleCopyPatientMemo}
						className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 cursor-pointer touch-manipulation"
						data-testid="btn-copy-perio-post-op-memo"
						title="Скопировать памятку пациенту для мессенджера"
					>
						<MessageSquare size={14} className="text-[var(--primary)]" />
						<span>Памятка пациенту</span>
					</button>

					<button
						type="button"
						onClick={handleAddServicesToInvoice}
						className="min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:bg-[var(--paper-soft)] flex items-center gap-1.5 cursor-pointer touch-manipulation"
						data-testid="btn-perio-bar-add-to-invoice"
						title="Добавить хирургические услуги в смету визита"
					>
						<span>В смету</span>
					</button>
				</div>
			</div>

			{renderControls()}

			<MobileBottomSheet
				isOpen={isMobileSheetOpen}
				onClose={() => setIsMobileSheetOpen(false)}
				title={`${norm.title} (FDI #${effectiveTooth})`}
				subtitle="Параметры операции, швы и тактика"
				testId="perio-bottom-sheet"
				footer={
					<div className="flex items-center gap-2 w-full">
						<button
							type="button"
							onClick={() => {
								handleAddServicesToInvoice();
								setIsMobileSheetOpen(false);
							}}
							className="flex-1 min-h-[48px] py-3 rounded-xl font-bold text-sm bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white shadow-xs touch-manipulation"
							data-testid="btn-mobile-apply-perio-sheet"
						>
							Применить в протокол и смету
						</button>
					</div>
				}
			>
				<div className="p-1 space-y-4">
					{renderControls()}
				</div>
			</MobileBottomSheet>
		</div>
	);
};

export default VisitSurgeryPerioBar;
