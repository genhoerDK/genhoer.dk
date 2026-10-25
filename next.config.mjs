/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "export", // Enables static exports
  reactStrictMode: true,
  turbopack: { root: import.meta.dirname }, // A package-lock.json in a parent folder would otherwise be mistaken for the project root
  env: {
    // Build time is inlined in both the static HTML and the browser bundle, so the first
    // client render matches the HTML before useToday() switches to the visitor's date
    BUILD_DATE: new Date().toISOString(),
  },
};

export default nextConfig;
