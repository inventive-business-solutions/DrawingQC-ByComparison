import type { NextConfig } from "next";

/**
 * Backend connection.
 *
 * The UI talks to the C# backend (DrawingQC.Web) through a same-origin /api/* proxy. Same-origin
 * is load-bearing, not cosmetic: the backend's session cookie is HttpOnly, so it only rides along
 * while the browser believes these are same-origin requests. Pointing the UI straight at the
 * backend silently breaks sign-in.
 *
 * Set DRAWINGQC_API to wherever the backend is served, e.g.
 *   DRAWINGQC_API=http://localhost:5080 npm run dev        (local)
 *   DRAWINGQC_API=http://<host>:<port>                     (production)
 *
 * WSL note: with the UI under WSL and the backend on Windows, localhost only resolves across the
 * boundary if WSL mirrored networking is on (networkingMode=mirrored in .wslconfig).
 */
const API = process.env.DRAWINGQC_API ?? "http://localhost:5080";

const nextConfig: NextConfig = {
  async rewrites() {
    // Proxy /api/* to the backend so the browser sees same-origin requests (keeps the HttpOnly
    // session cookie working).
    return [{ source: "/api/:path*", destination: `${API}/api/:path*` }];
  },
};

export default nextConfig;
