import { useEffect, useState } from "react";

export function useToast() {
  const [msg, setMsg] = useState<string | undefined>();
  useEffect(() => {
    if (!msg) return;
    const t = setTimeout(() => setMsg(undefined), 2000);
    return () => clearTimeout(t);
  }, [msg]);
  return { msg, setMsg } as const;
}

