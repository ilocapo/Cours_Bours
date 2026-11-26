import { NextResponse } from "next/server";
import { getStore } from "@/lib/booking/store";

export const dynamic = "force-dynamic";

// Diagnostic sans secret : indique ce qui est branché. Ne renvoie jamais de clé.
export async function GET() {
  const out: Record<string, unknown> = {
    reservationInterneAuBuild: process.env.NEXT_PUBLIC_BOOKING_INTERNAL === "1",
    supabaseUrlPresente: !!process.env.SUPABASE_URL,
    supabaseCléPrésente: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    resendCléPrésente: !!process.env.RESEND_API_KEY,
    expéditeur: process.env.RESEND_FROM ? "défini" : "absent",
    motDePasseGestionDéfini: !!process.env.ADMIN_PASSWORD,
    cronSecretDéfini: !!process.env.CRON_SECRET,
  };
  try {
    const store = await getStore();
    out.base = store.kind;
    out.prestations = (await store.listServices()).length;
  } catch (e) {
    out.base = "erreur";
    out.erreurBase = e instanceof Error ? e.message.replace(/sb_secret_[\w-]+|eyJ[\w.-]+/g, "[clé]").slice(0, 200) : "inconnue";
  }
  return NextResponse.json(out);
}
