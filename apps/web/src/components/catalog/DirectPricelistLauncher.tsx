import React, { useEffect, useState } from "react";
import { ServicePricelistManagerModal } from "./ServicePricelistManagerModal";

export const DirectPricelistLauncher: React.FC = () => {
	const [isOpen, setIsOpen] = useState<boolean>(() => {
		if (typeof window === "undefined") return false;
		const s = window.location.search || "";
		const h = window.location.hash || "";
		if (s.includes("documents") || h.includes("documents")) return false;
		return (
			s.includes("pricelist") ||
			s.includes("catalog") ||
			h.includes("pricelist") ||
			h.includes("catalog")
		);
	});

	useEffect(() => {
		const handleOpenEvent = () => setIsOpen(true);
		window.addEventListener("dente-open-pricelist", handleOpenEvent);
		return () =>
			window.removeEventListener("dente-open-pricelist", handleOpenEvent);
	}, []);

	if (!isOpen) return null;

	const handleClose = () => {
		setIsOpen(false);
		if (typeof window !== "undefined") {
			const url = new URL(window.location.href);
			url.searchParams.delete("pricelist");
			url.searchParams.delete("catalog");
			const cleanHash = window.location.hash.replace(/#pricelist|#catalog/g, "");
			const newUrl =
				url.pathname +
				(url.search ? url.search : "") +
				cleanHash;
			window.history.replaceState({}, "", newUrl);
		}
	};

	return (
		<ServicePricelistManagerModal
			isOpen={isOpen}
			onClose={handleClose}
			onSaveCatalog={() => {
				handleClose();
			}}
		/>
	);
};