import { Copy, Download, Printer, Terminal } from "lucide-react";
import React, { useMemo, useState } from "react";
import { showToast } from "../../GlobalToast";
import { generateTsplLabelCode, generateZplLabelCode, type KraftPackageRecord } from "./kraftPackageEngine";

interface KraftTsplZplViewProps {
	packages: KraftPackageRecord[];
	previewPackage?: KraftPackageRecord | undefined;
}

export function KraftTsplZplView({ packages, previewPackage }: KraftTsplZplViewProps) {
	const [tsplProtocol, setTsplProtocol] = useState<"tspl" | "zpl">("tspl");
	const [tsplSize, setTsplSize] = useState<"58x40" | "43x25">("58x40");
	const [tsplCopies, setTsplCopies] = useState<number>(1);
	const [selectedTsplRecordId, setSelectedTsplRecordId] = useState<string>("");

	const activeTsplRecord = useMemo(() => {
		if (selectedTsplRecordId) {
			const found = packages.find((p) => p.id === selectedTsplRecordId);
			if (found) return found;
		}
		return previewPackage || packages[0] || null;
	}, [packages, selectedTsplRecordId, previewPackage]);

	const generatedPrinterScript = useMemo(() => {
		if (!activeTsplRecord) return "";
		if (tsplProtocol === "zpl") {
			return generateZplLabelCode(activeTsplRecord, { size: tsplSize, copies: tsplCopies, clinicName: "ООО «ДЕНТЕ СТОМАТОЛОГИЯ»" });
		}
		return generateTsplLabelCode(activeTsplRecord, { size: tsplSize, copies: tsplCopies, clinicName: "DENTE CLINIC ЦСО" });
	}, [activeTsplRecord, tsplProtocol, tsplSize, tsplCopies]);

	const handleCopy = async () => {
		try {
			await navigator.clipboard.writeText(generatedPrinterScript);
			showToast(`Команды ${tsplProtocol.toUpperCase()} скопированы`, "success", 2500);
		} catch {
			showToast("Не удалось скопировать команды", "error");
		}
	};

	const handleDownload = () => {
		const ext = tsplProtocol === "zpl" ? "zpl" : "tspl";
		const blob = new Blob([generatedPrinterScript], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `label_${activeTsplRecord?.barcode128 || "batch"}.${ext}`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		showToast(`Файл .${ext} сохранен`, "success", 2000);
	};

	return (
		<div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
			<div className="kraft-panel-card">
				<div className="kraft-panel-title">
					<div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
						<Terminal size={16} className="text-teal-600" />
						<span>Генератор прямых команд для термопринтеров (TSPL / ZPL II)</span>
					</div>
					<span style={{ fontSize: "0.8rem", color: "var(--teal, #0d9488)" }}>Прямая печать без диалоговых окон</span>
				</div>

				<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "0.75rem", marginBottom: "1rem" }}>
					<div>
						<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>Протокол:</label>
						<div style={{ display: "flex", gap: "0.5rem" }}>
							<button type="button" onClick={() => setTsplProtocol("tspl")} className={`kraft-btn ${tsplProtocol === "tspl" ? "kraft-btn-primary" : "kraft-btn-secondary"}`} style={{ flex: 1, minHeight: "44px" }}>TSPL</button>
							<button type="button" onClick={() => setTsplProtocol("zpl")} className={`kraft-btn ${tsplProtocol === "zpl" ? "kraft-btn-primary" : "kraft-btn-secondary"}`} style={{ flex: 1, minHeight: "44px" }}>ZPL II</button>
						</div>
					</div>

					<div>
						<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>Размер:</label>
						<div style={{ display: "flex", gap: "0.5rem" }}>
							<button type="button" onClick={() => setTsplSize("58x40")} className={`kraft-btn ${tsplSize === "58x40" ? "kraft-btn-primary" : "kraft-btn-secondary"}`} style={{ flex: 1, minHeight: "44px" }}>58×40 мм</button>
							<button type="button" onClick={() => setTsplSize("43x25")} className={`kraft-btn ${tsplSize === "43x25" ? "kraft-btn-primary" : "kraft-btn-secondary"}`} style={{ flex: 1, minHeight: "44px" }}>43×25 мм</button>
						</div>
					</div>

					<div>
						<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>Пакет:</label>
						<select value={selectedTsplRecordId || activeTsplRecord?.id || ""} onChange={(e) => setSelectedTsplRecordId(e.target.value)} style={{ width: "100%", minHeight: "44px", padding: "0.5rem", borderRadius: "8px", border: "1px solid var(--line)" }}>
							{packages.map((p) => (<option key={p.id} value={p.id}>{p.barcode128} — {p.toolSetNameRu}</option>))}
						</select>
					</div>

					<div>
						<label style={{ fontSize: "0.75rem", fontWeight: 700, color: "var(--muted)", display: "block", marginBottom: "0.35rem" }}>Копии:</label>
						<input type="number" min={1} max={100} value={tsplCopies} onChange={(e) => setTsplCopies(Math.max(1, parseInt(e.target.value) || 1))} className="kraft-number-input" style={{ width: "100%", minHeight: "44px" }} />
					</div>
				</div>

				<pre className="kraft-terminal-container" style={{ marginBottom: "1rem" }}><code>{generatedPrinterScript}</code></pre>

				<div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
					<button type="button" onClick={handleCopy} className="kraft-btn kraft-btn-secondary"><Copy size={16} /> Скопировать</button>
					<button type="button" onClick={handleDownload} className="kraft-btn kraft-btn-secondary"><Download size={16} /> Скачать</button>
					<button type="button" onClick={() => showToast(`Пакет ${tsplProtocol.toUpperCase()} отправлен на печать`, "success")} className="kraft-btn kraft-btn-primary"><Printer size={16} /> Отправить в принтер</button>
				</div>
			</div>
		</div>
	);
}
