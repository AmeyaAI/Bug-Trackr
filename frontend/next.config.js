/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['gsap'],
  // trailingSlash: true,
  images: {
    unoptimized: true,
  },
}

module.exports = nextConfig
