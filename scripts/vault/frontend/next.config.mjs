/** @type {import('next').NextConfig} */
const FLASK = process.env.FLASK_URL ?? 'http://localhost:5050'

const nextConfig = {
  output: 'standalone',
  productionBrowserSourceMaps: true,
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: `${FLASK}/api/:path*`,
      },
    ]
  },
}

export default nextConfig
