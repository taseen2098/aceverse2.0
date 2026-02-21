"use client";

import { useState } from "react";

export function useExamSave(examId: string) {
  const [loading, setLoading] = useState(false);

  const handleSave = async (showToast = true) => {
    setLoading(true);
    // Simulate save
    await new Promise(resolve => setTimeout(resolve, 500));
    setLoading(false);
    return true;
  };

  const confirmExit = () => {
    // No-op
  };

  return {
    handleSave,
    confirmExit,
    loading,
    isDirty: false
  };
}
