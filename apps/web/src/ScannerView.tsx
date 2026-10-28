/**
 * ScannerView.tsx
 *
 * Dedicated Sterilization, Autoclaves & SanPiN Workspace with Integrated Document Scanner.
 * Defaults to SanPiN & Autoclave Registers when accessed via CRM sidebar navigation.
 * Seamless 1-click toggle between sterilization registers and registry document scanning.
 */

import React, { useState, useEffect } from "react";
import { AutoclaveSterilizationLogModal, AutoclaveLog257Modal } from "./components/sanpin/autoclaveLog/AutoclaveSterilizationLogModal";
import { KraftPackageBarcodeModal } from "./components/sanpin/kraft/KraftPackageBarcodeModal";
import { SanpinRegisters, SanpinRegisters as SanpinRegistersView } from "./components/sanpin/SanpinRegisters";
import { DocumentCameraScannerModal } from "./components/scanner/DocumentCameraScannerModal";
import { ScannerHeaderBar } from "./components/scanner/ScannerHeaderBar";
import { ScannerDocumentWorkspace } from "./components/scanner/ScannerDocumentWorkspace";
import "./components/scanner/scannerCockpit.css";

export function ScannerView() {
	const [activeSubTab, setActiveSubTab] = useState<"scanner" | "sanpin">(() => {
		if (typeof window !== "undefined") {
			const search = window.location.search || "";
			const hash = window.location.hash || "";
			if (
				search.includes("tab=scanner") ||
				search.includes("tab=docs") ||
				hash.includes("tab=scanner") ||
				hash.includes("tab=docs") ||
				hash.includes("#docs")
			) {
				return "scanner";
			}
		}
		return "sanpin";
	});

	useEffect(() => {
		const checkHash = () => {
			const search = window.location.search || "";
			const hash = window.location.hash || "";
			if (
				search.includes("tab=scanner") ||
				search.includes("tab=docs") ||
				hash.includes("tab=scanner") ||
				hash.includes("tab=docs") ||
				hash.includes("#docs")
			) {
				setActiveSubTab("scanner");
			} else if (
				search.includes("sanpin") ||
				search.includes("steril") ||
				hash.includes("sanpin") ||
				hash.includes("steril")
			) {
				setActiveSubTab("sanpin");
			}
		};
		window.addEventListener("hashchange", checkHash);
		return () => window.removeEventListener("hashchange", checkHash);
	}, []);

	return (
		<div className="scanner-cockpit-root" data-testid="scanner-view-root">
			<ScannerHeaderBar
				activeSubTab={activeSubTab}
				onSelectSubTab={setActiveSubTab}
			/>

			{/* Sub-view Rendering */}
			{activeSubTab === "sanpin" ? (
				<div style={{ flex: 1, minHeight: 0, overflowY: "auto", overflowX: "clip", maxWidth: "100%" }}>
					<SanpinRegisters />
				</div>
			) : (
				<ScannerDocumentWorkspace />
			)}
		</div>
	);
}

// Backwards-compatible re-exports
export {
	SanpinRegisters,
	SanpinRegistersView,
	KraftPackageBarcodeModal,
	AutoclaveSterilizationLogModal,
	AutoclaveLog257Modal,
	DocumentCameraScannerModal,
};
export default ScannerView;
