import { type FormEvent } from "react";
import { ShieldCheck, Stethoscope } from "lucide-react";

export function AppLoadingState({ message }: { message: string }) {
  return (
    <main className="boot-state">
      <Stethoscope aria-hidden="true" />
      <h1>DENTE</h1>
      <p>{message}</p>
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
          <p>{accessMessage || "Сервер защищает медицинские данные. Введите x-dente-admin-secret для этой сессии."}</p>
        </div>
        <input
          type="password"
          autoComplete="current-password"
          value={adminSecretDraft}
          onChange={(event) => onAdminSecretChange(event.target.value)}
          placeholder="x-dente-admin-secret"
          aria-label="Секрет доступа DENTE"
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
