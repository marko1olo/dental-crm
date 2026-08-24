import React from "react";
import { SanpinRegistersView } from "./components/sanpin/SanpinRegistersView";
import { AutoclaveLog257Modal } from "./components/sanpin/autoclaveLog/AutoclaveLog257Modal";
import { SanpinJournalsModal } from "./components/sanpin/journals/SanpinJournalsModal";
import { KraftPackageBarcodeModal } from "./components/sanpin/kraft/KraftPackageBarcodeModal";
import { DocumentCameraScannerModal } from "./components/scanner/DocumentCameraScannerModal";

export function ScannerView() {
	return (
		<div
			className="scanner-view-wrapper"
			style={{
				display: "flex",
				flexDirection: "column",
				width: "100%",
			}}
		>
			{/* Main SanPiN Registers, Journals & Packaging Studio */}
			<SanpinRegistersView />
		</div>
	);
}

export {
	SanpinRegistersView,
	SanpinJournalsModal,
	KraftPackageBarcodeModal,
	AutoclaveLog257Modal,
	DocumentCameraScannerModal,
};
export default ScannerView;

