import React from "react";
import { SanpinRegistersView } from "./components/sanpin/SanpinRegistersView";
import { AutoclaveLog257Modal } from "./components/sanpin/autoclaveLog/AutoclaveLog257Modal";
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
	KraftPackageBarcodeModal,
	AutoclaveLog257Modal,
	DocumentCameraScannerModal,
};
export default ScannerView;

