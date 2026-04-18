

const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["steam-user", "steam-tradeoffer-manager", "steam-totp", "steamid"],
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "community.akamai.steamstatic.com",
      },
      {
        protocol: "https",
        hostname: "avatars.steamstatic.com",
      },
    ],
  },
};

export default nextConfig;
