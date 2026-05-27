import { lazy, Suspense } from "react";

const DentalWorkspace = lazy(() => import("./App").then((module) => ({ default: module.App })));

export function AppShell() {
  return (
    <Suspense
      fallback={
        <main className="boot-state" aria-busy="true">
          <h1>DENTE</h1>
          <p>Загрузка CRM</p>
        </main>
      }
    >
      <DentalWorkspace />
    </Suspense>
  );
}
