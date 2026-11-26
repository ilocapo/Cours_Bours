// Vidéos courtes (mp4, sans son, 480×640). Fichiers dans public/videos/.
export type Video = { src: string; poster?: string; label: string };
export const videos: Video[] = [
  { src: "/videos/tresses-boheme.mp4", poster: "/videos/tresses-boheme.jpg", label: "Tresses bohème, vues de dos" },
  { src: "/videos/ongles-french.mp4", poster: "/videos/ongles-french.jpg", label: "Pose d'ongles french avec détails dorés" },
  { src: "/videos/boucles.mp4", poster: "/videos/boucles.jpg", label: "Boucles définies" },
  { src: "/videos/salon.mp4", poster: "/videos/salon.jpg", label: "Visite du salon" },
  { src: "/videos/tresses-homme.mp4", poster: "/videos/tresses-homme.jpg", label: "Tresses pour homme" },
  { src: "/videos/ongles-blanc.mp4", poster: "/videos/ongles-blanc.jpg", label: "Pose d'ongles blancs" },
];
