// ============================================================
// Universal Persistence — Platform Agnostic Driver Interface
// ============================================================

/**
 * createNullDriver
 * Default for headless environments (no persistence)
 */
export const createNullDriver = () => ({
  load: () => null,
  save: () => {},
  export: (doc) => console.log("Export not implemented for this platform", doc)
});

/**
 * createWebDriver
 * For Browser environments
 */
export const createWebDriver = (key = "llm_kernel_state") => ({
  load: () => {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  save: (doc) => {
    try { localStorage.setItem(key, JSON.stringify(doc)); } catch {}
  },
  export: (doc) => {
    const blob = new Blob([JSON.stringify(doc, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `state_export_${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
});

// Autodetect default driver
export const getDefaultDriver = () => {
  if (typeof localStorage !== "undefined" && typeof document !== "undefined") {
    return createWebDriver();
  }
  return createNullDriver();
};
