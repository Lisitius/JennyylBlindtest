/** @type {import('next').NextConfig} */
const nextConfig = {
  // Le double-montage de React en dev crée deux lecteurs Spotify dont un
  // mort, ce qui casse la lecture ("device not found").
  reactStrictMode: false,
};

export default nextConfig;
