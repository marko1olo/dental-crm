import React from 'react';
import {
  Monitor,
  Camera,
  FolderSearch,
  FolderOpen,
  Cpu,
  Printer,
  Receipt,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';

type Obj = Record<string, unknown>;

export function renderWorkstationSection(
  tool: string,
  obj: Obj,
  result: unknown,
): React.ReactNode | null {
  const isWorkstation =
    tool.includes('workstation') ||
    tool.includes('capture') ||
    tool.includes('screen') ||
    tool.includes('dropzone') ||
    tool.includes('mcp') ||
    tool.includes('hardware') ||
    tool.includes('romexis') ||
    tool.includes('ez3d') ||
    obj.screen_capture !== undefined ||
    obj.workstation_files !== undefined ||
    obj.workstation_app !== undefined ||
    obj.fiscal_device !== undefined;

  if (!isWorkstation) return null;

  // 1. Visigraph & ROI Screen Capture Card
  if (
    tool.includes('capture') ||
    tool.includes('screen') ||
    obj.screen_capture !== undefined ||
    typeof obj.screenshotPath === 'string'
  ) {
    const rawCapture = (obj.screen_capture && typeof obj.screen_capture === 'object'
      ? obj.screen_capture
      : obj) as Obj;

    const appName = String(rawCapture.appName || rawCapture.targetApp || 'Planmeca Romexis (Визиограф)');
    const dimensions = String(rawCapture.dimensions || `${rawCapture.width || 1440}x${rawCapture.height || 900}`);
    const filePath = String(rawCapture.filePath || rawCapture.path || 'storage/radiology/RVG_scan.png');
    const fileName = filePath.split(/[/\\]/).pop() || 'RVG_scan.png';
    const statusText = String(rawCapture.status || 'Снимок готов и прикреплён к ЭМК');
    const format = String(rawCapture.format || 'PNG').toUpperCase();

    return (
      <div
        className="p-3.5 rounded-xl bg-[var(--paper-strong,#fafcfa)] border border-[var(--line,rgba(15,118,110,0.15))] shadow-sm space-y-2 text-xs"
        data-testid="copilot-workstation-capture-card"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--teal-soft,#ccfbf1)] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
              <Camera size={16} />
            </div>
            <div>
              <h4 className="font-bold text-[var(--ink,#0f172a)] text-xs">
                Оптический захват визиографа (ПК)
              </h4>
              <p className="text-[10px] text-[var(--muted,#6b7280)]">{appName}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--teal-soft,#ccfbf1)] text-[var(--teal-dark,#0f766e)] text-[10px] font-bold">
            <CheckCircle2 size={12} />
            Готово
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2 bg-[var(--paper-soft,#f4f7f6)] p-2.5 rounded-lg border border-[var(--line)]">
          <div>
            <span className="block text-[10px] text-[var(--muted)] font-medium">Файл снимка:</span>
            <span className="font-semibold text-[var(--ink)] truncate block" title={filePath}>
              {fileName}
            </span>
          </div>
          <div>
            <span className="block text-[10px] text-[var(--muted)] font-medium">Параметры:</span>
            <span className="font-semibold text-[var(--ink)]">
              {dimensions} • {format}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between pt-1">
          <span className="text-[11px] text-[var(--muted)]">{statusText}</span>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('dente:open-radiology-viewer', { detail: { filePath } }),
                );
              }
            }}
          >
            <ExternalLink size={13} />
            <span>Открыть RVG</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. Workstation File Search & Study Dropzone Card
  if (
    tool.includes('file') ||
    tool.includes('dropzone') ||
    tool.includes('study') ||
    obj.workstation_files !== undefined ||
    Array.isArray(obj.files)
  ) {
    const rawFiles = (obj.workstation_files && typeof obj.workstation_files === 'object'
      ? obj.workstation_files
      : obj) as Obj;
    const filesList = Array.isArray(rawFiles.files) ? (rawFiles.files as Obj[]) : [];
    const folderPath = String(rawFiles.folderPath || rawFiles.root || 'C:\\MedicalStudies\\Patients');
    const totalFound = filesList.length || Number(rawFiles.totalFound || rawFiles.filesCount || 0);

    return (
      <div
        className="p-3.5 rounded-xl bg-[var(--paper-strong,#fafcfa)] border border-[var(--line,rgba(15,118,110,0.15))] shadow-sm space-y-2 text-xs"
        data-testid="copilot-workstation-files-card"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--teal-soft,#ccfbf1)] text-[var(--teal,#0d9488)] flex items-center justify-center shrink-0">
              <FolderSearch size={16} />
            </div>
            <div>
              <h4 className="font-bold text-[var(--ink,#0f172a)] text-xs">
                Снимки и КЛКТ на рабочей станции
              </h4>
              <p className="text-[10px] text-[var(--muted,#6b7280)] truncate max-w-[220px]" title={folderPath}>
                {folderPath}
              </p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-[var(--teal-soft,#ccfbf1)] text-[var(--teal-dark,#0f766e)] text-[10px] font-bold">
            Найдено: {totalFound}
          </span>
        </div>

        {filesList.length > 0 && (
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {filesList.slice(0, 3).map((f, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-1.5 rounded bg-[var(--paper-soft)] border border-[var(--line)] text-[11px]"
              >
                <span className="truncate font-medium text-[var(--ink)] max-w-[200px]">
                  {String(f.name || f.path || `Исследование ${i + 1}`)}
                </span>
                <span className="text-[10px] text-[var(--muted)] font-mono shrink-0 ml-2">
                  {f.sizeBytes ? `${Math.round(Number(f.sizeBytes) / 1024)} КБ` : String(f.size || 'DICOM')}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-end pt-1">
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)] text-xs font-semibold hover:bg-[var(--paper-soft)] transition-colors cursor-pointer"
            onClick={() => {
              if (typeof window !== 'undefined') {
                window.dispatchEvent(
                  new CustomEvent('dente:open-dropzone-folder', { detail: { folderPath } }),
                );
              }
            }}
          >
            <FolderOpen size={13} />
            <span>Открыть папку томографа</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. Medical App Launch Card
  if (
    tool.includes('launch') ||
    tool.includes('app') ||
    obj.workstation_app !== undefined ||
    (typeof obj.appName === 'string' && obj.pid !== undefined)
  ) {
    const rawApp = (obj.workstation_app && typeof obj.workstation_app === 'object'
      ? obj.workstation_app
      : obj) as Obj;
    const appName = String(rawApp.appName || rawApp.app || 'Медицинское ПО томографа');
    const pid = rawApp.pid ? `PID: ${rawApp.pid}` : 'Активно в ОС';
    const status = String(rawApp.status || 'Запущено на рабочем месте врача');

    return (
      <div
        className="p-3.5 rounded-xl bg-[var(--paper-strong,#fafcfa)] border border-[var(--line)] shadow-sm space-y-2 text-xs"
        data-testid="copilot-workstation-app-card"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
              <Cpu size={16} />
            </div>
            <div>
              <h4 className="font-bold text-[var(--ink)] text-xs">{appName}</h4>
              <p className="text-[10px] text-[var(--muted)]">{status}</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-[var(--paper-soft)] border border-[var(--line)] text-[10px] font-mono text-[var(--ink)]">
            {pid}
          </span>
        </div>
      </div>
    );
  }

  // 4. Hardware MCP Bridge / Fiscal Registrar Card
  if (
    tool.includes('hardware') ||
    tool.includes('fiscal') ||
    tool.includes('mcp') ||
    obj.fiscal_device !== undefined
  ) {
    const rawDev = (obj.fiscal_device && typeof obj.fiscal_device === 'object'
      ? obj.fiscal_device
      : obj) as Obj;
    const deviceName = String(rawDev.device || rawDev.name || 'Фискальный регистратор (Атол)');
    const port = String(rawDev.port || 'COM3 / USB');
    const state = String(rawDev.status || 'Готов к печати кассовых чеков');

    return (
      <div
        className="p-3.5 rounded-xl bg-[var(--paper-strong,#fafcfa)] border border-[var(--line)] shadow-sm space-y-2 text-xs"
        data-testid="copilot-workstation-hardware-card"
      >
        <div className="flex items-center justify-between gap-2 border-b border-[var(--line)] pb-2">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-[var(--teal-soft)] text-[var(--teal)] flex items-center justify-center shrink-0">
              <Receipt size={16} />
            </div>
            <div>
              <h4 className="font-bold text-[var(--ink)] text-xs">{deviceName}</h4>
              <p className="text-[10px] text-[var(--muted)]">Порт: {port}</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[var(--teal-soft)] text-[var(--teal-dark)] text-[10px] font-bold">
            <CheckCircle2 size={12} />
            В сети
          </span>
        </div>
        <p className="text-[11px] text-[var(--muted)]">{state}</p>
      </div>
    );
  }

  return null;
}
