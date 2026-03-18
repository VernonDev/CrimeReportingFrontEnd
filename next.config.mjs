/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // Allow serving uploaded images from the backend
  images: {
    remotePatterns: [
      {
        protocol: 'http',
        hostname: 'localhost',
        port: '4000',
        pathname: '/uploads/**',
      },
    ],
  },
};

export default nextConfig;
