// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { GameInfo } from "../../../shared/GameInfo.ts";
import { corsHeaders } from "../Cors.ts";

Deno.serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    // get user auth id
    const user = await supabase.auth.getUser();

    // generate UUID
    const gameID = crypto.randomUUID();

    // if user is not authenticated, return 401
    if (!user || !user.data.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // get request body as json
    const gameData = await req.json();

    if (!gameData) {
      return new Response("Bad Request", { status: 400 });
    }

    // create a new game
    const { data, error } = await supabase.from("games").insert([
      {
        id: gameID,
        host: user?.data.user?.id,
        other: null,
        gameState: gameData,
      } as GameInfo,
    ]);

    if (error) throw error;

    return new Response(JSON.stringify({ data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});

/* To invoke locally:

  1. Run `supabase start` (see: https://supabase.com/docs/reference/cli/supabase-start)
  2. Make an HTTP request:

  curl -i --location --request POST 'http://127.0.0.1:54321/functions/v1/create-game' \
    --header 'Authorization: Bearer ' \
    --header 'Content-Type: application/json' \
    --data '{"name":"Functions"}'

*/
