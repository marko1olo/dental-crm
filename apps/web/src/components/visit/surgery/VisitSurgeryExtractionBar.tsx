import React, { useState } from "react";
import { Zap, CheckCircle2, MessageSquare, ShieldCheck } from "lucide-react";
import { showToast } from "../../GlobalToast";
import {
	EXTRACTION_COMPLEXITY_OPTIONS,
	SURGICAL_HEMOSTASIS_OPTIONS,
	buildStandardExtractionProtocolText,
	buildPostExtractionMemoText,
	type ExtractionComplexity,
	type SurgicalHemostasisMethod,
} from "../../surgery/surgeryProtocols";

export interface VisitSurgeryExtractionBarProps {
	readonly effectiveTooth: number;
	readonly patientName?: string;
	readonly doctorName?: string;
	readonly onApplyProtocolText: (text: string) => void;
}

export const VisitSurgeryExtractionBar: React.FC<VisitSurgeryExtractionBarProps> = ({
	effectiveTooth,
	patientName = "Пациент",
	doctorName = "Хирург-стоматолог",
	onApplyProtocolText,
}) => {
	const [complexity, setComplexity] = useState<ExtractionComplexity>("simple");
	const [selectedHemostasis, setSelectedHemostasis] = useState<SurgicalHemostasisMethod[]>([
		"alvogyl",
		"tampon",
	]);
	const [sutureMaterial, setSutureMaterial] = useState<string>("Викрил 4-0");

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
		showToast(
			`Сложность: ${newComplexity === "simple" ? "Простое" : newComplexity === "complex" ? "Сложное с разъединением корней" : "Ретинированное/Атипичное"}`,
			"info",
		);
	};

	// 1-Клик норма врача: Протокол без осложнений (Мандат 8e)
	const handleApplyUncomplicatedNorm = () => {
		const text = buildStandardExtractionProtocolText({
			toothFdi: effectiveTooth,
			complexity,
			hemostasis: ["alvogyl", "hemostatic_sponge", "vicryl_suture", "tampon"],
			sutureMaterial: "Викрил 4-0",
			postOpXray: true,
		});
		setSelectedHemostasis(["alvogyl", "hemostatic_sponge", "vicryl_suture", "tampon"]);
		onApplyProtocolText(text);
		showToast("1-Клик норма: Протокол без осложнений / Лунка ушита / Гемостаз полный", "success");
	};

	// 1-Клик памятка пациенту (WhatsApp / SMS) без эмодзи
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

	return (
		<div
			className="p-3.5 rounded-2xl bg-[var(--paper-soft)] border border-[var(--line)] space-y-3"
			data-testid="visit-surgery-extraction-bar"
		>
			{/* Верхний ряд: Заголовок и 1-Клик норма */}
			<div className="flex items-center justify-between gap-2 flex-wrap">
				<div className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-[var(--teal,#0d9488)]">
					<ShieldCheck size={16} />
					<span>1-Клик Протокол удаления зуба:</span>
				</div>

				<div className="flex items-center gap-2 flex-wrap">
					<button
						type="button"
						onClick={handleApplyUncomplicatedNorm}
						className="min-h-[44px] px-4 py-2 rounded-xl text-xs font-black bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] flex items-center gap-2 cursor-pointer shadow-xs hover:opacity-95 transition-all touch-manipulation"
						data-testid="btn-uncomplicated-extraction-norm"
						title="1-Клик норма: лунка ушита, Альвожил, гемостаз полный"
					>
						<Zap size={14} className="text-amber-300" />
						<span>✓ Протокол без осложнений: лунка ушита, гемостаз полный</span>
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

			{/* Сложность удаления */}
			<div className="space-y-1">
				<span className="text-[11px] font-bold text-[var(--muted)]">Сложность экстракции (Номенклатура 804н):</span>
				<div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
					{EXTRACTION_COMPLEXITY_OPTIONS.map((opt) => {
						const isSel = complexity === opt.id;
						return (
							<button
								key={opt.id}
								type="button"
								onClick={() => handleComplexityChange(opt.id)}
								className={`min-h-[44px] px-3 py-2 rounded-xl text-xs font-bold text-left border cursor-pointer transition-all flex items-center justify-between touch-manipulation ${
									isSel
										? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)] border-[var(--teal,#0d9488)] shadow-xs"
										: "bg-[var(--paper)] text-[var(--ink)] border-[var(--line)] hover:border-[var(--teal,#0d9488)]"
								}`}
								data-testid={`btn-extraction-complexity-${opt.id}`}
							>
								<div className="flex flex-col min-w-0">
									<span className="font-extrabold whitespace-normal break-words leading-tight text-xs">{opt.labelRu.split("(")[0]?.trim()}</span>
									<span className="text-[10px] opacity-75 font-mono">{opt.code804n}</span>
								</div>
								{isSel && <CheckCircle2 size={16} className="text-[var(--on-teal,#ffffff)] shrink-0 ml-1" />}
							</button>
						);
					})}
				</div>
			</div>

			{/* Гемостаз и шовный материал */}
			<div className="space-y-1">
				<span className="text-[11px] font-bold text-[var(--muted)]">Местный гемостаз & Лунка (1 клик):</span>
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
					<div className="flex items-center gap-1 ml-auto">
						<span className="text-[11px] text-[var(--muted)]">Шов:</span>
						{["Викрил 4-0", "ПГА 4-0", "Пролен 4-0"].map((s) => (
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
								className={`min-h-[44px] px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
									sutureMaterial === s
										? "bg-[var(--teal,#0d9488)] text-[var(--on-teal,#ffffff)]"
										: "bg-[var(--paper)] text-[var(--ink)] border border-[var(--line)]"
								}`}
								data-testid={`btn-suture-${s.replace(/\s+/g, "-")}`}
							>
								{s}
							</button>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default VisitSurgeryExtractionBar;
