import React, { useState, useEffect } from "react";
import { Zap, CheckCircle2, MessageSquare, ShieldCheck, Plus, SlidersHorizontal } from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	EXTRACTION_COMPLEXITY_OPTIONS,
	SURGICAL_HEMOSTASIS_OPTIONS,
	buildStandardExtractionProtocolText,
	buildPostExtractionMemoText,
	getExtractionServices804n,
	dispatchSurgicalServicesToInvoice,
	type ExtractionComplexity,
	type SurgicalHemostasisMethod,
	type SurgicalService804n,
} from "../../surgery/surgeryProtocols";
import { MobileBottomSheet } from "../../mobile/MobileBottomSheet";
import { triggerHaptic } from "../../../native/mobileBridge";

export interface VisitSurgeryExtractionBarProps {
	readonly effectiveTooth: number;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly onApplyProtocolText: (text: string) => void;
	readonly onAddToInvoice?: ((services: readonly SurgicalService804n[]) => void) | undefined;
}

export const VisitSurgeryExtractionBar: React.FC<VisitSurgeryExtractionBarProps> = ({
	effectiveTooth,
	patientName = "Пациент",
	doctorName = "Хирург-стоматолог",
	onApplyProtocolText,
	onAddToInvoice,
}) => {
	const [complexity, setComplexity] = useState<ExtractionComplexity>("simple");
	const [selectedHemostasis, setSelectedHemostasis] = useState<SurgicalHemostasisMethod[]>([
		"alvogyl",
		"tampon",
	]);
	const [sutureMaterial, setSutureMaterial] = useState<string>("Викрил 4-0");
	const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
	const [isMobile, setIsMobile] = useState<boolean>(
		typeof window !== "undefined" && window.innerWidth <= 768,
	);

	useEffect(() => {
		const handleResize = () => {
			setIsMobile(typeof window !== "undefined" && window.innerWidth <= 768);
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const toggleHemostasis = (method: SurgicalHemostasisMethod) => {
		setSelectedHemostasis((prev) => {
			const next = prev.includes(method)
				? prev.filter((m) => m !== method)
				: [...prev, method];
			// Auto-sync with protocol
			const text = buildStandardExtractionProtocolText({
				toothFdi: effectiveTooth,
				complexity,
				hemostasis: next,
				sutureMaterial,
				postOpXray: true,
			});
			onApplyProtocolText(text);
			return next;
		});
	};

	const handleComplexityChange = (newComplexity: ExtractionComplexity) => {
		setComplexity(newComplexity);
		const text = buildStandardExtractionProtocolText({
			toothFdi: effectiveTooth,
			complexity: newComplexity,
			hemostasis: selectedHemostasis,
			sutureMaterial,
			postOpXray: true,
		});
		onApplyProtocolText(text);

		// 1-клик автоматическое начисление в смету визита по Номенклатуре 804н
		const services = getExtractionServices804n({
			complexity: newComplexity,
			toothFdi: effectiveTooth,
			hemostasis: selectedHemostasis,
			sutureMaterial,
		});
		dispatchSurgicalServicesToInvoice({
			toothFdi: effectiveTooth,
			customServices: services,
			onAddToInvoice,
		});

		showToast(
			`Сложность: ${newComplexity === "simple" ? "Простое (A16.07.001)" : newComplexity === "complex" ? "Сложное с разъединением корней (A16.07.001.001)" : "Ретинированное/Атипичное (A16.07.001.002)"} · Добавлено в смету`,
			"info",
		);
	};

	// Начисление услуг удаления в смету (1 клик)
	const handleAddServicesToInvoice = () => {
		const services = getExtractionServices804n({
			complexity,
			toothFdi: effectiveTooth,
			hemostasis: selectedHemostasis,
			sutureMaterial,
		});
		dispatchSurgicalServicesToInvoice({
			toothFdi: effectiveTooth,
			customServices: services,
			onAddToInvoice,
		});
		const totalRub = services.reduce((acc, s) => acc + (s.priceRub || 0) * (s.quantity || 1), 0);
		showToast(
			`Услуги удаления (#${effectiveTooth}) на сумму ${totalRub.toLocaleString("ru-RU")} ₽ начислены в смету: ${services.map((s) => s.code).join(", ")}`,
			"success",
		);
	};

	// Протокол без осложнений (Мандат 8e)
	const handleApplyUncomplicatedNorm = () => {
		const uncomplicatedHemo: SurgicalHemostasisMethod[] = [
			"alvogyl",
			"hemostatic_sponge",
			"vicryl_suture",
			"tampon",
		];
		const text = buildStandardExtractionProtocolText({
			toothFdi: effectiveTooth,
			complexity,
			hemostasis: uncomplicatedHemo,
			sutureMaterial: "Викрил 4-0",
			postOpXray: true,
		});
		setSelectedHemostasis(uncomplicatedHemo);
		setSutureMaterial("Викрил 4-0");
		onApplyProtocolText(text);

		// Auto-dispatch services to invoice
		const services = getExtractionServices804n({
			complexity,
			toothFdi: effectiveTooth,
			hemostasis: uncomplicatedHemo,
			sutureMaterial: "Викрил 4-0",
		});
		dispatchSurgicalServicesToInvoice({
			toothFdi: effectiveTooth,
			customServices: services,
			onAddToInvoice,
		});

		showToast("✓ Физиологическая норма: Протокол без осложнений / Лунка ушита / Гемостаз полный", "success");
	};

	// Памятка пациенту (WhatsApp / SMS)
	const handleCopyPatientMemo = () => {
		const memo = buildPostExtractionMemoText({
			patientName,
			toothFdi: effectiveTooth,
			doctorName,
			complexity,
			hasSutures: selectedHemostasis.includes("vicryl_suture") || complexity !== "simple",
			sutureRemovalDays: 7,
		});
		navigator.clipboard?.writeText(memo);
		showToast("Памятка пациенту после удаления скопирована в буфер (WhatsApp / SMS)", "success");
	};

	// Рендер элементов управления сложностью и гемостазом
	const renderControls = () => (
		<div className="space-y-3">
			{/* Сложность удаления */}
			<div className="space-y-1.5">
				<div className="flex items-center justify-between">
					<span className="text-[11px] font-bold text-[var(--muted)]">Сложность экстракции (Услуга):</span>
					<button
						type="button"
						onClick={handleAddServicesToInvoice}
						className="text-xs font-bold text-[var(--teal,#0d9488)] hover:underline flex items-center gap-1 cursor-pointer min-h-[44px] px-2 touch-manipulation"
						data-testid="btn-extraction-add-to-invoice"
						title="Добавить хирургические услуги в смету визита"
					>
						<Plus size={14} />
						<span>В смету</span>
					</button>
				</div>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
					{EXTRACTION_COMPLEXITY_OPTIONS.map((opt) => {
						const isSel = complexity === opt.id;
						return (
							<button
								key={opt.id}
								type="button"
								onClick={() => handleComplexityChange(opt.id)}
								className={`min-h-[44px] px-3 py-2.5 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all flex items-center justify-between touch-manipulation ${
									isSel
										? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
								}`}
								data-testid={`btn-extraction-complexity-${opt.id}`}
							>
								<div className="flex flex-col min-w-0">
									<span className="font-extrabold whitespace-normal break-words leading-tight text-xs">
										{opt.labelRu.split("(")[0]?.trim()}
									</span>
									<span className="text-[10px] opacity-75 font-mono">{opt.code804n}</span>
								</div>
								{isSel && <CheckCircle2 size={16} className="text-[var(--on-teal,#ffffff)] shrink-0 ml-1" />}
							</button>
						);
					})}
				</div>
			</div>

			{/* Гемостаз и шовный материал */}
			<div className="space-y-1.5">
				<span className="text-[11px] font-bold text-[var(--muted)]">Местный гемостаз & Лунка:</span>
				<div className="flex items-center gap-2 flex-wrap" role="toolbar" aria-label="Опции гемостаза">
					{SURGICAL_HEMOSTASIS_OPTIONS.map((opt) => {
						const isSel = selectedHemostasis.includes(opt.id);
						return (
							<button
								key={opt.id}
								type="button"
								onClick={() => toggleHemostasis(opt.id)}
								className={`min-h-[44px] px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation flex items-center gap-1.5 ${
									isSel
										? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
								}`}
								data-testid={`btn-hemostasis-${opt.id}`}
								title={opt.descriptionRu}
							>
								{isSel && <CheckCircle2 size={13} className="shrink-0" />}
								<span>{opt.shortBadge}</span>
							</button>
						);
					})}

					{/* Выбор шовного материала */}
					<div className="flex items-center gap-1.5 ml-auto flex-wrap">
						<span className="text-[11px] text-[var(--muted)]">Шов:</span>
						{["Викрил 4-0", "Монофиламент", "Шелк 3-0", "Пролен 4-0", "ПГА 4-0"].map((s) => (
							<button
								key={s}
								type="button"
								onClick={() => {
									setSutureMaterial(s);
									const text = buildStandardExtractionProtocolText({
										toothFdi: effectiveTooth,
										complexity,
										hemostasis: selectedHemostasis,
										sutureMaterial: s,
										postOpXray: true,
									});
									onApplyProtocolText(text);
								}}
								className={`min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer touch-manipulation ${
									sutureMaterial === s
										? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]"
										: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]"
								}`}
								data-testid={`btn-suture-${s.replace(/[\s.]+/g, "-")}`}
							>
								{s}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);

	return (
		<div
			className="p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3 overflow-x-clip max-w-full"
			data-testid="visit-surgery-extraction-bar"
		>
			{/* Верхний ряд: Заголовок и главные действия */}
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[var(--teal,#0d9488)]">
					<ShieldCheck size={16} />
					<span>Протокол удаления зуба:</span>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					{/* Кнопка открытия Bottom Sheet на мобильных (Apple HIG) */}
					{isMobile && (
						<button
							type="button"
							onClick={() => {
								triggerHaptic("selection");
								setIsMobileSheetOpen(true);
							}}
							className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--teal,#0d9488)] bg-[var(--teal-surface,rgba(13,148,136,0.1))] text-[var(--teal,#0d9488)] flex items-center gap-1.5 cursor-pointer touch-manipulation"
							data-testid="btn-open-extraction-mobile-sheet"
							title="Открыть параметры сложности и гемостаза в Bottom Sheet"
						>
							<SlidersHorizontal size={14} />
							<span>Шторка параметров</span>
						</button>
					)}

					<button
						type="button"
						onClick={handleApplyUncomplicatedNorm}
						className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center gap-2 cursor-pointer shadow-xs hover:opacity-95 transition-all touch-manipulation"
						data-testid="btn-uncomplicated-extraction-norm"
						title="Физиологическая норма: лунка ушита, Альвожил, гемостаз полный"
					>
						<Zap size={14} className="text-amber-300" />
						<span>Протокол без осложнений: лунка ушита, гемостаз полный</span>
					</button>

					<button
						type="button"
						onClick={handleCopyPatientMemo}
						className="min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] hover:border-[var(--teal,#0d9488)] flex items-center gap-1.5 cursor-pointer touch-manipulation"
						data-testid="btn-copy-post-op-memo"
						title="Скопировать памятку пациенту для мессенджера"
					>
						<MessageSquare size={14} className="text-[var(--teal,#0d9488)]" />
						<span>Памятка пациенту (WhatsApp)</span>
					</button>
				</div>
			</div>

			{/* Inline Controls (на десктопе всегда, на мобильных в виде компактного блока) */}
			{renderControls()}

			{/* Apple Mobile HIG Native Bottom Sheet Drawer (<=768px) */}
			<MobileBottomSheet
				isOpen={isMobileSheetOpen}
				onClose={() => setIsMobileSheetOpen(false)}
				title={`Удаление зуба FDI #${effectiveTooth}`}
				subtitle="Параметры сложности, гемостаз и швы (Apple iOS HIG)"
				testId="extraction-bottom-sheet"
				footer={
					<div className="flex items-center gap-2 w-full">
						<button
							type="button"
							onClick={() => {
								handleAddServicesToInvoice();
								setIsMobileSheetOpen(false);
							}}
							className="flex-1 min-h-[48px] py-3 rounded-xl font-black text-sm bg-[var(--teal,#0d9488)] text-white shadow-xs touch-manipulation"
							data-testid="btn-mobile-apply-extraction-sheet"
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

export default VisitSurgeryExtractionBar;
