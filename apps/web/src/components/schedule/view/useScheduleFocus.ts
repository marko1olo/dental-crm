import { useRef, useCallback, useEffect } from "react";
import { motionSafeScrollIntoView } from "../../../lib/motionSafeScroll";

export interface UseScheduleFocusParams {
  showCreateForm: boolean;
  setShowCreateForm: (show: boolean) => void;
}

export function useScheduleFocus({
  showCreateForm,
  setShowCreateForm,
}: UseScheduleFocusParams) {
  const focusCreateFormRequestedRef = useRef(false);

  const focusVisibleCreateFormControl = useCallback(() => {
    const wrapper = document.getElementById("new-appointment-form");
    if (!wrapper) return;

    const isVisible = (element: HTMLElement) => {
      if (
        typeof (
          element as unknown as {
            checkVisibility?: (opts?: {
              checkOpacity?: boolean;
              checkVisibilityCSS?: boolean;
            }) => boolean;
          }
        ).checkVisibility === "function"
      ) {
        return (
          element as unknown as {
            checkVisibility: (opts?: {
              checkOpacity?: boolean;
              checkVisibilityCSS?: boolean;
            }) => boolean;
          }
        ).checkVisibility({ checkOpacity: true, checkVisibilityCSS: true });
      }
      if (element.offsetParent === null && element.style.position !== "fixed")
        return false;
      const rect = element.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return false;
      const style = window.getComputedStyle(element);
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        Number.parseFloat(style.opacity) > 0
      );
    };

    const scope =
      wrapper.querySelector<HTMLElement>(".appointment-manual-form") ?? wrapper;
    const target = Array.from(
      scope.querySelectorAll<HTMLElement>("select, input, textarea, button"),
    ).find(
      (element) => !element.hasAttribute("disabled") && isVisible(element),
    );

    motionSafeScrollIntoView(target ?? scope, { block: "center" });
    target?.focus({ preventScroll: true });
  }, []);

  const focusNewAppointmentEditor = () => {
    if (!showCreateForm) {
      focusCreateFormRequestedRef.current = true;
      setShowCreateForm(true);
      return;
    }
    focusVisibleCreateFormControl();
  };

  useEffect(() => {
    if (!showCreateForm) return;
    if (!focusCreateFormRequestedRef.current) return;
    focusCreateFormRequestedRef.current = false;
    focusVisibleCreateFormControl();
  }, [showCreateForm, focusVisibleCreateFormControl]);

  return {
    focusNewAppointmentEditor,
  };
}
