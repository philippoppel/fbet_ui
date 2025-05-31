// src/app/hooks/useHasMounted.ts
import { useState, useEffect } from 'react';

/** Liefert erst `true`, wenn der Component-Tree im Browser gemountet ist. */
export const useHasMounted = () => {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
};
