import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { applyBrandingToDocument, getCachedSiteSettings } from "./lib/siteBranding";

// Disable right-click context menu
document.addEventListener("contextmenu", (e) => e.preventDefault());

// Disable common inspect shortcuts
document.addEventListener("keydown", (e) => {
  // F12
  if (e.key === "F12") e.preventDefault();
  // Ctrl+Shift+I / Cmd+Option+I
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "I") e.preventDefault();
  // Ctrl+Shift+J / Cmd+Option+J
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "J") e.preventDefault();
  // Ctrl+Shift+C / Cmd+Option+C
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "C") e.preventDefault();
  // Ctrl+U / Cmd+U (view source)
  if ((e.ctrlKey || e.metaKey) && e.key === "u") e.preventDefault();
  // Ctrl+S / Cmd+S (save page)
  if ((e.ctrlKey || e.metaKey) && e.key === "s") e.preventDefault();
});

// Disable text selection and drag
document.addEventListener("selectstart", (e) => e.preventDefault());
document.addEventListener("dragstart", (e) => e.preventDefault());

applyBrandingToDocument(getCachedSiteSettings());

createRoot(document.getElementById("root")!).render(<App />);
