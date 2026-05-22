// next.config.ts
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Core configuration options here */
  reactStrictMode: true,
  
  // This ensures that when you test on your local network (like your phone or another laptop),
  // Next.js safely accepts development connections from your local machine's network IP.
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  
  // Modern configuration setup for allowing dev origins without throwing experimental warnings
  experimental: {
    serverActions: {
      allowedOrigins: ['192.168.0.100', 'localhost:3000'],
    },
  },
};

export default nextConfig;