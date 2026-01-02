/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals = config.externals || [];
      config.externals.push('https');
      config.externals.push('http');
      config.externals.push('url');
      config.externals.push('util');
    }
    return config;
  },
};

export default nextConfig;
