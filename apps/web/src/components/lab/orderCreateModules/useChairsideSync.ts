import { useEffect } from "react";
import type { ChairsideSyncSetters } from "./chairsideSyncTypes";

export type { ChairsideSyncSetters };

export function useChairsideSync(setters: ChairsideSyncSetters) {
	const {
		isOpen, setNewTeethInput, setIsBridge, setNewWorkType,
		setNewShade, setNewStumpShade, setNewPriceRub, setNewCostRub,
		setNewExpectedLabDate, setNewFittingDate, setNewClinicalNotes,
	} = setters;

	useEffect(() => {
		const applyChairsideDraft = (draft: {
			toothFdi?: string;
			material?: string;
			colorVita?: string;
			stumpShade?: string;
			preparationMargin?: string;
			preparationMarginLabel?: string;
			priceRub?: number;
			costRub?: number;
			dueDate?: string;
		}) => {
			if (!draft) return;
			if (draft.toothFdi) {
				setNewTeethInput(String(draft.toothFdi));
				if (String(draft.toothFdi).includes(",") || String(draft.toothFdi).includes(" ")) {
					setIsBridge(true);
				}
			}
			if (draft.material) {
				const matLower = String(draft.material).toLowerCase();
				if (matLower.includes("e.max") || matLower.includes("emax") || matLower.includes("винир") || matLower.includes("veneer")) {
					setNewWorkType("crown_emax");
				} else if (matLower.includes("zro2") || matLower.includes("zirconia") || matLower.includes("цирконий") || matLower.includes("katana")) {
					setNewWorkType("crown_zirconia");
				} else if (matLower.includes("pmma") || matLower.includes("временн") || matLower.includes("temporary")) {
					setNewWorkType("temporary_pmma");
				} else if (matLower.includes("бюгель") || matLower.includes("clasp")) {
					setNewWorkType("clasp_prosthesis");
				} else if (matLower.includes("металлокерам") || matLower.includes("noritake")) {
					setNewWorkType("metal_ceramic");
				}
			}
			if (draft.colorVita) setNewShade(draft.colorVita);
			if (draft.stumpShade) setNewStumpShade(draft.stumpShade);
			if (typeof draft.priceRub === "number") setNewPriceRub(draft.priceRub);
			if (typeof draft.costRub === "number") setNewCostRub(draft.costRub);
			if (draft.dueDate) {
				setNewExpectedLabDate(draft.dueDate);
				setNewFittingDate(draft.dueDate);
			}
			const margin = draft.preparationMarginLabel || draft.preparationMargin;
			if (margin) {
				const marginNote = `[Уступ ЗТЛ: ${margin}]`;
				setNewClinicalNotes((prev) =>
					prev && prev.includes(marginNote) ? prev : prev ? `${marginNote}\n${prev}` : marginNote,
				);
			}
		};

		const handleApplyShade = (e: Event) => {
			const customEvent = e as CustomEvent<{ shadeCode?: string; stumpShadeCode?: string; notes?: string }>;
			const detail = customEvent?.detail;
			if (!detail) return;
			if (detail.shadeCode) setNewShade(detail.shadeCode);
			if (detail.stumpShadeCode) setNewStumpShade(detail.stumpShadeCode);
			if (detail.notes) {
				setNewClinicalNotes((prev) =>
					prev && prev.includes(detail.notes!) ? prev : prev ? `${prev}\n${detail.notes}` : detail.notes!,
				);
			}
		};

		const handleOpenModal = (e: Event) => {
			const customEvent = e as CustomEvent<any>;
			if (customEvent?.detail) applyChairsideDraft(customEvent.detail);
		};

		window.addEventListener("dente-apply-lab-shade", handleApplyShade);
		window.addEventListener("dente-open-lab-order-modal", handleOpenModal);

		if (isOpen) {
			try {
				const chairDraftRaw = (typeof sessionStorage !== "undefined" && sessionStorage.getItem("dente_chairside_ortho_order_draft")) ||
					(typeof localStorage !== "undefined" && localStorage.getItem("dente_chairside_ortho_order_draft"));
				if (chairDraftRaw) applyChairsideDraft(JSON.parse(chairDraftRaw));
			} catch {}
			try {
				const saved = localStorage.getItem("dente_active_lab_shade_preset");
				if (saved) {
					const data = JSON.parse(saved);
					if (data.shadeCode) setNewShade(data.shadeCode);
					if (data.stumpShadeCode) setNewStumpShade(data.stumpShadeCode);
					if (data.notes) {
						setNewClinicalNotes((prev) => prev && prev.includes(data.notes) ? prev : prev ? `${prev}\n${data.notes}` : data.notes);
					}
				}
			} catch {}
		}

		return () => {
			window.removeEventListener("dente-apply-lab-shade", handleApplyShade);
			window.removeEventListener("dente-open-lab-order-modal", handleOpenModal);
		};
	}, [isOpen, setNewTeethInput, setIsBridge, setNewWorkType, setNewShade, setNewStumpShade, setNewPriceRub, setNewCostRub, setNewExpectedLabDate, setNewFittingDate, setNewClinicalNotes]);
}
