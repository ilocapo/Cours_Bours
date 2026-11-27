/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { formats: ["image/avif", "image/webp"] },
  poweredByHeader: false,
  // Liens courts pour la bio Instagram, les affiches et les QR codes.
  async redirects() {
    return [
      { source: "/instagram", destination: "https://ig.me/m/zst_beauty_center", permanent: false },
      { source: "/whatsapp", destination: "https://wa.me/22967703535?text=Bonjour%2C%20je%20souhaite%20r%C3%A9server%20un%20rituel%20chez%20ZST%20Beauty%20Center.", permanent: false },
    ];
  },
  // La réservation interne s'active seule dès que la base est branchée (SUPABASE_URL),
  // ou explicitement avec NEXT_PUBLIC_BOOKING_INTERNAL=1. Valeur figée à la construction du site.
  env: {
    NEXT_PUBLIC_BOOKING_INTERNAL: process.env.NEXT_PUBLIC_BOOKING_INTERNAL || (process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY ? "1" : ""),
  },
};
export default nextConfig;
