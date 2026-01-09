
import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

serve(async (req) => {
  try {
    const body = await req.json();

    if (body.type !== "payment") {
      return new Response("Evento ignorado", { status: 200 });
    }

    const payment = body.data;
    const email = payment?.payer?.email;

    if (payment?.status !== "approved" || !email) {
      return new Response("Pagamento não aprovado", { status: 200 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const accessUntil = new Date();
    accessUntil.setDate(accessUntil.getDate() + 30);

    await supabase
      .from("authorized_users")
      .upsert({
        email,
        access_until: accessUntil.toISOString(),
        status: "active",
        updated_at: new Date().toISOString(),
      });

    return new Response("Acesso liberado", { status: 200 });

  } catch (error) {
    console.error(error);
    return new Response("Erro interno", { status: 500 });
  }
});
