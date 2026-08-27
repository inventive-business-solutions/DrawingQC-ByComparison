import type { NextConfig } from "next";

/**
 * No backend connection.
 *
 * The UI is standalone: lib/api.ts answers every call from fixtures, so nothing is ever sent to
 * /api/* and the proxy to the C# app (DrawingQC.Web) has been removed. It is kept below,
 * commented out, for whenever the backend is wired back up.
 */
const nextConfig: NextConfig = {};

export default nextConfig;

/* ---------------------------------------------------------------------------------------------
 * REMOVED: the /api/* proxy to the C# backend.
 *
 * To restore, put this back and uncomment the matching block in lib/api.ts.
 *
 * Program.cs binds 5080 by default, but binds $PORT when one is set — and the local instance was
 * normally started with PORT=5001, which is why the fallback below is 5001 and not 5080.
 *
 *   const API = process.env.DRAWINGQC_API ?? "http://localhost:5001";
 *
 *   const nextConfig: NextConfig = {
 *     // Proxy /api/* to the backend. Same-origin from the browser's point of view, which
 *     // matters for more than tidiness: the C# session cookie is HttpOnly, so it only rides
 *     // along while the browser believes these are same-origin calls. Point the UI straight at
 *     // the backend instead and login silently stops working.
 *     async rewrites() {
 *       return [{ source: "/api/:path*", destination: `${API}/api/:path*` }];
 *     },
 *   };
 *
 * One trap when running the backend for real: with the UI under WSL and the backend on Windows,
 * localhost only resolves across the boundary if WSL mirrored networking is on
 * (networkingMode=mirrored in .wslconfig). Without it WSL's localhost is its own loopback and
 * the backend is invisible no matter which port is used.
 * ------------------------------------------------------------------------------------------ */
