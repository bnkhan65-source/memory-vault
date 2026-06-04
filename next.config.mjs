/** @type {import('next').NextConfig} */
const nextConfig = {
  allowedDevOrigins: ['10.0.0.3', 'closest-squad-batteries-addressing.trycloudflare.com', 'memory-vault-qrbb.vercel.app'],
  async rewrites() {
    return [
      {
        source: '/__/auth/:path*',
        destination: 'https://memory-vault-954c2.firebaseapp.com/__/auth/:path*',
      },
    ];
  },
};

export default nextConfig;
