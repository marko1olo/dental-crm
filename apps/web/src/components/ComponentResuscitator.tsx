import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallbackName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  attempts: number;
}

export class ComponentResuscitator extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    attempts: 0
  };

  private timer: NodeJS.Timeout | null = null;
  private resetAttemptsTimer: NodeJS.Timeout | null = null;

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error(`[ComponentResuscitator] Intercepted crash in "${this.props.fallbackName || "Widget"}":`, error, errorInfo);
    this.attemptRecovery();
  }

  public componentDidUpdate(prevProps: Props, prevState: State) {
    if (prevState.hasError && !this.state.hasError && this.state.attempts > 0) {
      if (this.resetAttemptsTimer) clearTimeout(this.resetAttemptsTimer);
      console.log(`[ComponentResuscitator] Component "${this.props.fallbackName || "Widget"}" recovered. Scheduling attempts reset in 5s of stable operation...`);
      this.resetAttemptsTimer = setTimeout(() => {
        if (!this.state.hasError) {
          console.log(`[ComponentResuscitator] Component "${this.props.fallbackName || "Widget"}" is stable. Resetting attempts counter to 0.`);
          this.setState({ attempts: 0 });
        }
      }, 5000);
    }
  }

  public componentWillUnmount() {
    this.clearTimer();
    window.removeEventListener("webglcontextlost", this.handleWebGLContextLost, true);
  }

  public componentDidMount() {
    // Listen for WebGL context loss to automatically recover rendering
    window.addEventListener("webglcontextlost", this.handleWebGLContextLost, true);
  }

  private handleWebGLContextLost = (event: Event) => {
    console.warn("[ComponentResuscitator] WebGL context lost detected! Triggering auto-recovery...");
    event.preventDefault(); // Prevent default browser behavior
    
    // Clear Cornerstone3D cache and trigger custom event to reinitialize imaging viewer
    if (typeof (window as any).cornerstone !== "undefined") {
      try {
        (window as any).cornerstone.cache.purgeCache();
        console.log("[ComponentResuscitator] Cornerstone3D VRAM cache purged successfully.");
      } catch (err: any) {
        console.error("[ComponentResuscitator] Failed to purge Cornerstone3D cache:", err.message);
      }
    }

    // Dispatch event to force re-render any imaging workbenches
    window.dispatchEvent(new CustomEvent("restore-webgl-context"));
    
    // Force Error Boundary remount to recover canvas
    this.setState({ hasError: true, attempts: 0 });
    this.attemptRecovery();
  };

  private attemptRecovery = () => {
    this.clearTimer();
    const { attempts } = this.state;
    
    if (attempts < 3) {
      const delays = [1000, 3000, 5000];
      const delay = delays[attempts];
      console.log(`[ComponentResuscitator] Scheduling auto-recovery attempt #${attempts + 1} in ${delay}ms...`);
      
      this.timer = setTimeout(() => {
        this.setState((prev) => ({
          hasError: false,
          error: null,
          attempts: prev.attempts + 1
        }));
      }, delay);
    } else {
      console.warn(`[ComponentResuscitator] Recovery failed after ${attempts} attempts. Showing permanent fallback.`);
    }
  };

  private handleManualReset = () => {
    console.log("[ComponentResuscitator] Manual reset triggered by user.");
    this.setState({ hasError: false, error: null, attempts: 0 });
  };

  private clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.resetAttemptsTimer) {
      clearTimeout(this.resetAttemptsTimer);
      this.resetAttemptsTimer = null;
    }
  }

  public render() {
    if (this.state.hasError) {
      const isRecovering = this.state.attempts < 3;

      return (
        <article
          className="component-crash-fallback"
          style={{
            background: "rgba(239, 68, 68, 0.08)",
            border: "1px dashed rgb(239, 68, 68)",
            padding: "24px",
            borderRadius: "12px",
            textAlign: "center",
            margin: "16px 0",
            backdropFilter: "blur(4px)",
            boxSizing: "border-box"
          }}
        >
          <div style={{ fontSize: "2rem", marginBottom: "12px" }}>⚠️</div>
          <h4 style={{ margin: "0 0 8px 0", color: "var(--ink)", fontSize: "1.1rem" }}>
            Виджет временно недоступен
          </h4>
          <p style={{ margin: "0 0 16px 0", color: "var(--muted)", fontSize: "0.95rem" }}>
            {this.props.fallbackName ? `В модуле "${this.props.fallbackName}" произошел сбой.` : "В работе компонента возникла ошибка."}{" "}
            {isRecovering
              ? `Выполняется авто-восстановление (попытка ${this.state.attempts + 1}/3)...`
              : "Авто-восстановление не удалось."}
          </p>
          <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
            <button
              className="secondary-button"
              type="button"
              onClick={this.handleManualReset}
              style={{ padding: "6px 14px", fontSize: "0.9rem" }}
            >
              Перезапустить вручную
            </button>
          </div>
        </article>
      );
    }

    return this.props.children;
  }
}
