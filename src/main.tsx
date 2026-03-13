import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { setForexApiKey } from "./lib/forex-api";

setForexApiKey('eddcaba6ff1e4077ad3d89a082658918');

createRoot(document.getElementById("root")!).render(<App />);
