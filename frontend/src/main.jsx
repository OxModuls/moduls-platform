import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App";
import { Buffer } from "buffer";

// Polyfill self for browser and global for Node.js
const globalObject = typeof self !== "undefined" ? self : global;

Object.assign(globalObject, {
  Buffer: Buffer,
});

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
); 