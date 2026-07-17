import { Blocks } from "lucide-react";
import { WorkspaceFeaturesSelector } from "../workspace/WorkspaceFeaturesSelector";

export function SettingsModulesTab() {
	return (
		<section className="settings-zone animate-fade-in" id="settings-modules">
			<header className="zone-header">
				<div className="zone-title-group">
					<div className="zone-icon-box">
						<Blocks aria-hidden="true" />
					</div>
					<div className="zone-title-text">
						<h2>Модули и функции</h2>
						<p>Включайте только те инструменты, которые нужны вашей клинике</p>
					</div>
				</div>
			</header>

			<div style={{ maxWidth: 700, margin: "0 auto", padding: "0 1rem" }}>
				<WorkspaceFeaturesSelector />
			</div>
		</section>
	);
}
