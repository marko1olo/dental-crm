import { useCallback, useEffect, useRef, useState } from "react";
import type { OutpatientProtocolTemplate, OutpatientSpecialty } from "@dental/shared";

interface UiStateParams {
	readonly isTemplatesOpenProp?: boolean | undefined;
	readonly onToggleTemplates?: ((open: boolean) => void) | undefined;
}

export function useVisitSoapUiState({
	isTemplatesOpenProp,
	onToggleTemplates,
}: UiStateParams) {
	const [activeViewMode, setActiveViewMode] = useState<"fields" | "full_text">("fields");
	const [localTemplatesOpen, setLocalTemplatesOpen] = useState<boolean>(false);
	const isTemplatesOpen = isTemplatesOpenProp !== undefined ? isTemplatesOpenProp : localTemplatesOpen;
	const setIsTemplatesOpen = useCallback(
		(val: boolean | ((prev: boolean) => boolean)) => {
			const next = typeof val === "function" ? val(isTemplatesOpen) : val;
			setLocalTemplatesOpen(next);
			onToggleTemplates?.(next);
		},
		[isTemplatesOpen, onToggleTemplates],
	);

	const [activeSpecialty, setActiveSpecialty] = useState<OutpatientSpecialty | "all">("all");
	const [searchQuery, setSearchQuery] = useState<string>("");
	const [previewProtocol, setPreviewProtocol] = useState<OutpatientProtocolTemplate | null>(null);
	const [isIcd10SelectorOpen, setIsIcd10SelectorOpen] = useState<boolean>(false);
	const [isCorrectionMode, setIsCorrectionMode] = useState<boolean>(false);
	const [isSoapMoreOpen, setIsSoapMoreOpen] = useState<boolean>(false);
	const soapMoreRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		if (!isSoapMoreOpen) return;
		const handleClickOutside = (e: MouseEvent) => {
			if (soapMoreRef.current && !soapMoreRef.current.contains(e.target as Node)) {
				setIsSoapMoreOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [isSoapMoreOpen]);

	return {
		activeViewMode,
		setActiveViewMode,
		isTemplatesOpen,
		setIsTemplatesOpen,
		activeSpecialty,
		setActiveSpecialty,
		searchQuery,
		setSearchQuery,
		previewProtocol,
		setPreviewProtocol,
		isIcd10SelectorOpen,
		setIsIcd10SelectorOpen,
		isCorrectionMode,
		setIsCorrectionMode,
		isSoapMoreOpen,
		setIsSoapMoreOpen,
		soapMoreRef,
	};
}
