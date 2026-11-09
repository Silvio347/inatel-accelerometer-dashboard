import { useState } from 'react';

/** A string setting remembered in localStorage. */
export function useSetting(key: string, fallback: string): [string, (value: string) => void] {
  const [value, setValue] = useState(() => localStorage.getItem(key) ?? fallback);
  function update(next: string) {
    localStorage.setItem(key, next);
    setValue(next);
  }
  return [value, update];
}
