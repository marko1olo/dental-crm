import { type FormEvent } from "react";
import { RefreshCw, ShieldCheck, Stethoscope } from "lucide-react";

type AppLoadingStateProps = {
  actionLabel?: string;
  message: string;
  onAction?: () => void;
};

export function AppLoadingState({ actionLabel, message, onAction }: AppLoadingStateProps) {
  return (
    <main className="boot-state" aria-busy={onAction ? undefined : "true"}>
      <Stethoscope aria-hidden="true" />
      <h1>DENTE</h1>
      <p>{message}</p>
      {onAction ? (
        <button className="secondary-button boot-retry-button" type="button" onClick={onAction}>
          <RefreshCw aria-hidden="true" /> {actionLabel ?? "Повторить"}
        </button>
      ) : null}
    </main>
  );
}

type AppUnlockStateProps = {
  accessMessage: string;
  adminSecretDraft: string;
  onAdminSecretChange: (value: string) => void;
  onUnlock: () => void;
};

export function AppUnlockState({ accessMessage, adminSecretDraft, onAdminSecretChange, onUnlock }: AppUnlockStateProps) {
  const secretReady = adminSecretDraft.trim().length > 0;

  const submitUnlock = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!secretReady) return;
    onUnlock();
  };

  return (
    <main className="boot-state boot-unlock-state">
      <ShieldCheck aria-hidden="true" />
      <h1>DENTE</h1>
      <form className="boot-unlock-form" onSubmit={submitUnlock}>
        <div>
          <strong>Нужен доступ к данным клиники</strong>
          <p>{accessMessage || "Сервер защищает медицинские данные. Введите секрет администратора для этой сессии."}</p>
        </div>
        <input
          type="password"
          autoComplete="current-password"
          value={adminSecretDraft}
          onChange={(event) => onAdminSecretChange(event.target.value)}
          placeholder="введите секрет администратора"
          aria-label="Секрет доступа к данным клиники"
          aria-describedby={!secretReady ? "boot-unlock-guidance" : undefined}
        />
        {!secretReady ? (
          <p className="boot-unlock-guidance" id="boot-unlock-guidance" role="status" aria-live="polite">
            Введите секрет доступа, который выдал администратор клиники.
          </p>
        ) : null}
        <button className="primary-button" type="submit" disabled={!secretReady}>
          <ShieldCheck aria-hidden="true" /> Открыть смену
        </button>
        <small>Секрет хранится только в памяти вкладки и сбрасывается после перезагрузки.</small>
      </form>
    </main>
  );
}
