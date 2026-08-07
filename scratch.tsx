import { useCallback, useEffect } from 'react';
export function useTest(a: string, b: string) {
    const fn = useCallback(() => {
        return a + b;
    }, []);
    useEffect(() => { fn(); }, [fn]);
}
