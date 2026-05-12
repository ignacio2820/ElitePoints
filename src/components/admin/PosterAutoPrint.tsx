"use client";

import { useEffect } from "react";
import { useSearchParams } from "next/navigation";

export function PosterAutoPrint() {
  const searchParams = useSearchParams();
  const shouldPrint = searchParams.get("print") === "1";

  useEffect(() => {
    if (!shouldPrint) return;
    const timer = window.setTimeout(() => window.print(), 400);
    return () => window.clearTimeout(timer);
  }, [shouldPrint]);

  return null;
}
