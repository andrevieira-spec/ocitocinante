import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Build timestamp: 2025-11-19T22:10:00Z - Cache buster
console.log('[CBOS] Build version: 1.0.1-no-lovable');

createRoot(document.getElementById("root")!).render(<App />);
