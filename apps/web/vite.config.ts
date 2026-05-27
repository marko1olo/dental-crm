import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replaceAll("\\", "/");
          if (normalizedId.endsWith("/apps/web/src/AppBootState.tsx")) return "boot-state";
          if (normalizedId.endsWith("/apps/web/src/workspaceShell.tsx")) return "workspace-shell";
          if (normalizedId.endsWith("/apps/web/src/ClinicalRulePanel.tsx")) return "clinical-rules";
          if (normalizedId.endsWith("/apps/web/src/settingsStaticData.tsx")) return "settings-static-data";
          if (normalizedId.endsWith("/apps/web/src/visitSpecialtyData.ts")) return "visit-specialty-data";
          if (normalizedId.endsWith("/apps/web/src/visitDictationData.ts")) return "visit-dictation-data";
          if (normalizedId.endsWith("/apps/web/src/postVisitCareData.ts")) return "post-visit-care-data";
          if (normalizedId.endsWith("/apps/web/src/communicationTaskData.ts")) return "communication-task-data";
          if (normalizedId.endsWith("/apps/web/src/App.tsx")) return "workspace";
          if (normalizedId.includes("/node_modules/react") || normalizedId.includes("/node_modules/react-dom")) return "react-vendor";
          if (normalizedId.includes("/node_modules/lucide-react")) return "icons";
          if (normalizedId.includes("/node_modules/zod")) return "schema-vendor";
          if (normalizedId.includes("/packages/shared")) return "dental-shared";
          return undefined;
        }
      }
    }
  },
  server: {
    proxy: {
      "/api": "http://127.0.0.1:4100"
    }
  }
});
