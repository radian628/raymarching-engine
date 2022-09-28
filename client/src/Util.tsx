export function useInterval<T extends (...args: any[]) => any>(callback: T, period: number, ...args: Parameters<T>) {
    const interval = setInterval(callback, period, ...args);
    return () => {
        clearInterval(interval);
    }
}