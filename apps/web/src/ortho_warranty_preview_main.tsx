import React from "react";
import { createRoot } from "react-dom/client";
import "./styles/tailwind.css";
import "./styles/main.css";
import "./styles/shadow-analyst.css";
import "./styles/modules/patients.css";
import "./styles/patients-redesign.css";
import { OrthopedicsChairsidePanel } from "./components/orthopedics/OrthopedicsChairsidePanel";
import { GlobalToast } from "./components/GlobalToast";

function OrthoPreviewApp() {
	return (
		<div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-2 sm:p-6 text-slate-900 dark:text-slate-100 font-sans">
			<div className="max-w-6xl mx-auto space-y-4">
				<header className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
					<div>
						<h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-slate-100">
							DENTE · Протезирование у кресла и наряды ЗТЛ
						</h1>
						<p className="text-xs text-slate-600 dark:text-slate-400">
							Клинические протоколы · Оттенки VITA · Паспорт конструкции
						</p>
					</div>
					<div className="text-right text-xs font-mono text-slate-500 dark:text-slate-400">
						Пациент: Иванов И.И. (043-882) · Зуб 16
					</div>
				</header>

				<main className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-3 sm:p-5">
					<OrthopedicsChairsidePanel
						patientId="pat-preview-884"
						activeToothFdi={16}
						selectedTeeth={[16]}
						recentToothXrayUrl="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><rect width='100' height='100' fill='%23134e4a'/><text x='50' y='55' fill='white' font-size='12' text-anchor='middle'>X-RAY 16</text></svg>"
						initialLabOrder={{
							id: "order-884102",
							orderNumber: "ЗТЛ-884102",
							toothFdi: 16,
							material: "Диоксид циркония Katana HTML",
							colorVita: "A2",
							stumpShade: "ND2",
							technicianName: "Петров И.С. (ЗТЛ CAD/CAM)",
							warrantyPassport: "ГП-ЗТЛ-884102",
							status: "ready_in_clinic",
							stage: "fitting",
						}}
						onConfirmFitting={(id) => console.log("Fitting confirmed:", id)}
						onOpenLabOrder={() => console.log("Open lab order")}
						onAddToInvoice={(services) => console.log("Added to invoice:", services)}
					/>
				</main>
			</div>
			<GlobalToast />
		</div>
	);
}

const container = document.getElementById("root");
if (container) {
	const root = createRoot(container);
	root.render(<OrthoPreviewApp />);
}
