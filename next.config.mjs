/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { formats: ["image/avif", "image/webp"] },
  poweredByHeader: false,
  // La réservation interne s'active seule dès que la base est branchée (SUPABASE_URL),
  // ou explicitement avec NEXT_PUBLIC_BOOKING_INTERNAL=1. Valeur figée à la construction du site.
  env: {
    NEXT_PUBLIC_BOOKING_INTERNAL: process.env.NEXT_PUBLIC_BOOKING_INTERNAL || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "1" : ""),
  },
};
export default nextConfig;
