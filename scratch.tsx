import { useCallback } from "react";
export function useLogic(a: any, b: any) {
  const fn = useCallback(() => { return { a, b }; }, []);
  return fn;
}
