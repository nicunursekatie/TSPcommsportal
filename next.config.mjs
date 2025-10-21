/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    SUPABASE_NEXT_PUBLIC_SUPABASE_URL: process.env.SUPABASE_NEXT_PUBLIC_SUPABASE_SUPABASE_NEXT_PUBLIC_SUPABASE_ANON_KEY_ANON_KEY: process.env.SUPABASE_NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
