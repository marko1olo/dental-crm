export type BrowserContinuityRegistrationState = "unsupported" | "not_registered" | "installing" | "waiting" | "active" | "error";

export type BrowserCtOfflineStorageBoundary = {
  mode: "metadata_only";
  indexedDbStore: "dicomWorkbenchDrafts";
  mprIndexedDbStore: "mprWorkbenchDrafts";
  savesDiagnosticPixels: false;
  savesMeshGeometry: false;
  storesDirectoryHandles: false;
  storesUserFilePaths: false;
  opfsDiagnosticStorageEnabled: false;
  opfsSyncAccessHandleWorkerOnly: true;
  heavyDataOwner: "external_viewer_or_future_local_module";
};

export const browserContinuityRegistrationLabels: Record<BrowserContinuityRegistrationState, string> = {
  unsupported: "не поддерживается",
  not_registered: "не включено",
  installing: "готовится",
  waiting: "обновляется",
  active: "готово",
  error: "ошибка"
};

export type BrowserContinuityStatus = {
  checkedAt: string;
  serviceWorkerSupported: boolean;
  serviceWorkerControlled: boolean;
  serviceWorkerRegistrationState: BrowserContinuityRegistrationState;
  localStorageWritable: boolean;
  indexedDbSupported: boolean;
  cacheStorageSupported: boolean;
  opfsSupported: boolean;
  directoryPickerSupported: boolean;
  filePickerSupported: boolean;
  browserCtOfflineStorageBoundary: BrowserCtOfflineStorageBoundary;
  storagePersisted: boolean | null;
  storageUsageMb: number | null;
  storageQuotaMb: number | null;
  warnings: string[];
};

type BrowserFileAccessWindow = Window & {
  showDirectoryPicker?: unknown;
  showOpenFilePicker?: unknown;
};

type BrowserStorageManagerWithOpfs = StorageManager & {
  getDirectory?: unknown;
};

export const browserCtOfflineStorageBoundary: BrowserCtOfflineStorageBoundary = {
  mode: "metadata_only",
  indexedDbStore: "dicomWorkbenchDrafts",
  mprIndexedDbStore: "mprWorkbenchDrafts",
  savesDiagnosticPixels: false,
  savesMeshGeometry: false,
  storesDirectoryHandles: false,
  storesUserFilePaths: false,
  opfsDiagnosticStorageEnabled: false,
  opfsSyncAccessHandleWorkerOnly: true,
  heavyDataOwner: "external_viewer_or_future_local_module"
};

function browserLocalStorageWritable(): boolean {
  if (typeof window === "undefined") return false;
  const probeKey = "dental-crm:storage-probe";
  try {
    window.localStorage.setItem(probeKey, "1");
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

function megabytes(value: number | null | undefined): number | null {
  return typeof value === "number" && Number.isFinite(value) ? Math.round((value / 1024 / 1024) * 10) / 10 : null;
}

export function formatMegabytes(value: number | null): string {
  if (value === null) return "н/д";
  return `${value.toLocaleString("ru-RU")} МБ`;
}

export function formatByteSize(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) return "н/д";
  if (value <= 0) return "0 МБ";
  const valueMb = value / 1024 / 1024;
  if (valueMb < 0.1) return "<0,1 МБ";
  return formatMegabytes(Math.round(valueMb * 10) / 10);
}

export async function inspectBrowserContinuity(): Promise<BrowserContinuityStatus> {
  const warnings: string[] = [];
  const localStorageWritable = browserLocalStorageWritable();
  const indexedDbSupported = typeof window !== "undefined" && "indexedDB" in window;
  const cacheStorageSupported = typeof window !== "undefined" && "caches" in window;
  const fileAccessWindow = typeof window !== "undefined" ? (window as BrowserFileAccessWindow) : null;
  const directoryPickerSupported = typeof fileAccessWindow?.showDirectoryPicker === "function";
  const filePickerSupported = typeof fileAccessWindow?.showOpenFilePicker === "function";
  const storageManager =
    typeof navigator !== "undefined" && navigator.storage ? (navigator.storage as BrowserStorageManagerWithOpfs) : null;
  const opfsSupported = typeof storageManager?.getDirectory === "function";
  const serviceWorkerSupported = typeof navigator !== "undefined" && "serviceWorker" in navigator;
  let serviceWorkerControlled = false;
  let serviceWorkerRegistrationState: BrowserContinuityRegistrationState = serviceWorkerSupported ? "not_registered" : "unsupported";

  if (serviceWorkerSupported) {
    try {
      serviceWorkerControlled = Boolean(navigator.serviceWorker.controller);
      const registration = await navigator.serviceWorker.getRegistration();
      if (registration?.active) serviceWorkerRegistrationState = "active";
      else if (registration?.waiting) serviceWorkerRegistrationState = "waiting";
      else if (registration?.installing) serviceWorkerRegistrationState = "installing";
      else serviceWorkerRegistrationState = "not_registered";
    } catch {
      serviceWorkerRegistrationState = "error";
      warnings.push("Проверка работы без сети недоступна");
    }
  }

  let storageUsageMb: number | null = null;
  let storageQuotaMb: number | null = null;
  let storagePersisted: boolean | null = null;
  if (typeof navigator !== "undefined" && navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      storageUsageMb = megabytes(estimate.usage);
      storageQuotaMb = megabytes(estimate.quota);
      storagePersisted = typeof navigator.storage.persisted === "function" ? await navigator.storage.persisted() : null;
    } catch {
      warnings.push("Оценка хранилища браузера недоступна");
    }
  }

  if (!localStorageWritable) warnings.push("Локальное хранилище черновиков недоступно");
  if (!indexedDbSupported) warnings.push("Браузер не дает сохранить аудио для отправки позже");
  if (!cacheStorageSupported) warnings.push("Браузер не дает сохранить экран для работы без сети");
  if (storageUsageMb !== null && storageQuotaMb !== null && storageQuotaMb > 0 && storageUsageMb / storageQuotaMb > 0.85) {
    warnings.push("Место для локальных черновиков почти заполнено");
  }

  return {
    checkedAt: new Date().toISOString(),
    serviceWorkerSupported,
    serviceWorkerControlled,
    serviceWorkerRegistrationState,
    localStorageWritable,
    indexedDbSupported,
    cacheStorageSupported,
    opfsSupported,
    directoryPickerSupported,
    filePickerSupported,
    browserCtOfflineStorageBoundary,
    storagePersisted,
    storageUsageMb,
    storageQuotaMb,
    warnings
  };
}
