import { useCallback, useState } from 'react';

let nextId = 1;

export function useEventLog(limit = 60) {
  const [entries, setEntries] = useState([]);
  const add = useCallback(
    (icon, text) => setEntries((prev) => [{ id: nextId++, at: new Date().toLocaleTimeString(), icon, text }, ...prev].slice(0, limit)),
    [limit],
  );
  const clear = useCallback(() => setEntries([]), []);
  return { entries, add, clear };
}

export function ms(start) {
  return Math.round(performance.now() - start);
}
