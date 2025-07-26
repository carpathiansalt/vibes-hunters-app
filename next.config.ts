import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    optimizePackageImports: ['livekit-client', '@googlemaps/js-api-loader'],
  },
  
  // Production optimizations
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production' ? {
      exclude: ['error', 'warn'],
    } : false,
  },
  
  // Bundle analyzer (enable with ANALYZE=true)
  webpack: (config, { isServer }) => {
    if (process.env.ANALYZE === 'true') {
      try {
        const { BundleAnalyzerPlugin } = require('webpack-bundle-analyzer');
        config.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'server',
            openAnalyzer: true,
          })
        );
      } catch (error) {
        console.warn('webpack-bundle-analyzer not installed. Run: npm install --save-dev webpack-bundle-analyzer');
      }
    }
    
    return config;
  },
};

export default nextConfig;
