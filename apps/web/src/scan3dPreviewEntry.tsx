import React from "react";
import ReactDOM from "react-dom/client";
import { DentalUniversal3DViewer } from "./components/imaging/DentalUniversal3DViewer";

const rootEl = document.getElementById("root");
if (rootEl) {
	const root = ReactDOM.createRoot(rootEl);
	root.render(
		<DentalUniversal3DViewer
			patientName="Кузнецов А.В."
			toothCode={26}
			activeTeeth={["26"]}
			className="w-full h-full"
			isStandalone={true}
		/>,
	);
}
