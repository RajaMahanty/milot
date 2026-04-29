"use client";

import React, { Suspense } from "react";
import Board from "@/components/board/Board";

export default function BoardPage() {
  return (
    <div className="h-full">
      <Suspense fallback={<div className="flex items-center justify-center h-full"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" /></div>}>
        <Board />
      </Suspense>
    </div>
  );
}
