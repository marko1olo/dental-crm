import { useState, useEffect, useCallback } from "react";
import { showToast } from "../../../GlobalToast";
import {
	buildStandardExtractionProtocolText,
	buildPostExtractionMemoText,
	getExtractionSurgicalServices,
	dispatchSurgicalServicesToInvoice,
	type ExtractionComplexity,
	type SurgicalHemostasisMethod,
	type SurgicalServiceItem,
} from "../../../surgery/surgeryProtocols";

export interface UseExtractionBarStateParams {
	readonly effectiveTooth: number;
	readonly patientName?: string | undefined;
	readonly doctorName?: string | undefined;
	readonly onApplyProtocolText: (text: string) => void;
	readonly onAddToInvoice?: ((services: readonly SurgicalServiceItem[]) => void) | undefined;
}

export function useExtractionBarState({
	effectiveTooth,
	patientName = "Пациент",
	doctorName = "Хирург-стоматолог",
	onApplyProtocolText,
	onAddToInvoice,
}: UseExtractionBarStateParams) {
	const [complexity, setComplexity] = useState<ExtractionComplexity>("simple");
	const [selectedHemostasis, setSelectedHemostasis] = useState<SurgicalHemostasisMethod[]>(["alvogyl", "tampon"]);
	const [sutureMaterial, setSutureMaterial] = useState<string>("Викрил 4-0");
	const [isMobileSheetOpen, setIsMobileSheetOpen] = useState<boolean>(false);
	const [isMobile, setIsMobile] = useState<boolean>(typeof window !== "undefined" && window.innerWidth <= 768);

	useEffect(() => {
		const handleResize = () => setIsMobile(typeof window !== "undefined" && window.innerWidth <= 768);
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	const toggleHemostasis = useCallback((method: SurgicalHemostasisMethod) => {
		setSelectedHemostasis((prev) => {
			const next = prev.includes(method) ? prev.filter((m) => m !== method) : [...prev, method];
			onApplyProtocolText(buildStandardExtractionProtocolText({
				toothFdi: effectiveTooth, complexity, hemostasis: next, sutureMaterial, postOpXray: true,
			}));
			return next;
		});
	}, [complexity, effectiveTooth, onApplyProtocolText, sutureMaterial]);

	const handleComplexityChange = useCallback((newComplexity: ExtractionComplexity) => {
		setComplexity(newComplexity);
		onApplyProtocolText(buildStandardExtractionProtocolText({
			toothFdi: effectiveTooth, complexity: newComplexity, hemostasis: selectedHemostasis, sutureMaterial, postOpXray: true,
		}));
		const services = getExtractionSurgicalServices({
			complexity: newComplexity, toothFdi: effectiveTooth, hemostasis: selectedHemostasis, sutureMaterial,
		});
		dispatchSurgicalServicesToInvoice({ toothFdi: effectiveTooth, customServices: services, onAddToInvoice });
		const titleLabel = newComplexity === "simple" ? "Простое (A16.07.001)" : newComplexity === "complex" ? "Сложное (A16.07.001.001)" : "Ретинированное (A16.07.001.002)";
		showToast(`Сложность: ${titleLabel} · Добавлено в смету`, "info");
	}, [effectiveTooth, onAddToInvoice, onApplyProtocolText, selectedHemostasis, sutureMaterial]);

	const handleAddServicesToInvoice = useCallback(() => {
		const services = getExtractionSurgicalServices({
			complexity, toothFdi: effectiveTooth, hemostasis: selectedHemostasis, sutureMaterial,
		});
		dispatchSurgicalServicesToInvoice({ toothFdi: effectiveTooth, customServices: services, onAddToInvoice });
		const totalRub = services.reduce((acc, s) => acc + (s.priceRub || 0) * (s.quantity || 1), 0);
		showToast(`Услуги удаления (#${effectiveTooth}) на сумму ${totalRub.toLocaleString("ru-RU")} ₽ начислены в смету`, "success");
	}, [complexity, effectiveTooth, onAddToInvoice, selectedHemostasis, sutureMaterial]);

	const handleApplyUncomplicatedNorm = useCallback(() => {
		const uncomplicatedHemo: SurgicalHemostasisMethod[] = ["alvogyl", "hemostatic_sponge", "vicryl_suture", "tampon"];
		onApplyProtocolText(buildStandardExtractionProtocolText({
			toothFdi: effectiveTooth, complexity, hemostasis: uncomplicatedHemo, sutureMaterial: "Викрил 4-0", postOpXray: true,
		}));
		setSelectedHemostasis(uncomplicatedHemo);
		setSutureMaterial("Викрил 4-0");
		const services = getExtractionSurgicalServices({
			complexity, toothFdi: effectiveTooth, hemostasis: uncomplicatedHemo, sutureMaterial: "Викрил 4-0",
		});
		dispatchSurgicalServicesToInvoice({ toothFdi: effectiveTooth, customServices: services, onAddToInvoice });
		showToast("✓ Физиологическая норма: Протокол без осложнений / Лунка ушита / Гемостаз полный", "success");
	}, [complexity, effectiveTooth, onAddToInvoice, onApplyProtocolText]);

	const handleCopyPatientMemo = useCallback(() => {
		const memo = buildPostExtractionMemoText({
			patientName, toothFdi: effectiveTooth, doctorName, complexity,
			hasSutures: selectedHemostasis.includes("vicryl_suture") || complexity !== "simple", sutureRemovalDays: 7,
		});
		navigator.clipboard?.writeText(memo);
		showToast("Памятка пациенту после удаления скопирована в буфер (WhatsApp / SMS)", "success");
	}, [complexity, doctorName, effectiveTooth, patientName, selectedHemostasis]);

	const handleSelectSuture = useCallback((suture: string) => {
		setSutureMaterial(suture);
		onApplyProtocolText(buildStandardExtractionProtocolText({
			toothFdi: effectiveTooth, complexity, hemostasis: selectedHemostasis, sutureMaterial: suture, postOpXray: true,
		}));
	}, [complexity, effectiveTooth, onApplyProtocolText, selectedHemostasis]);

	return {
		complexity, selectedHemostasis, sutureMaterial, isMobileSheetOpen, isMobile,
		setIsMobileSheetOpen, toggleHemostasis, handleComplexityChange, handleAddServicesToInvoice,
		handleApplyUncomplicatedNorm, handleCopyPatientMemo, handleSelectSuture,
	};
}
