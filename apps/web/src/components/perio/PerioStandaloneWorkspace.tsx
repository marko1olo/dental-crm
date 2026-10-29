/**
 * PerioStandaloneWorkspace.tsx — Автономный экран кабинета пародонтологии
 * Делегирует в SSOT PerioWorkspaceModal (Мандаты 8b, 8e).
 */

import React from "react";
import { PerioWorkspaceModal } from "./PerioWorkspaceModal";

export function PerioStandaloneWorkspace(): React.ReactElement {
	return (
		<div className="w-full min-h-screen bg-[var(--paper)] text-[var(--ink)] p-3 sm:p-6 overflow-y-auto" data-testid="perio-standalone-workspace">
			<div className="w-full max-w-7xl mx-auto space-y-4">
				<PerioWorkspaceModal
					isOpen={true}
					isModal={false}
					patientId="demo_perio_patient"
					patientName="Смирнова Анна Сергеевна (Пародонтограмма)"
					doctorName="Д-р Соколов А. В."
				/>
			</div>
		</div>
	);
}

export default PerioStandaloneWorkspace;
