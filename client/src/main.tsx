import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Inject Meta Pixel ID for the deferred loader in index.html
if (import.meta.env.VITE_META_PIXEL_ID) {
  window.__META_PIXEL_ID__ = import.meta.env.VITE_META_PIXEL_ID;
}

createRoot(document.getElementById("root")!).render(<App />);
