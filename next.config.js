/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  images: {
    unoptimized: true
  },
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'pdfjs-dist']
  }
};

module.exports = nextConfig;
