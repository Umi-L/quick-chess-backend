// Follow this setup guide to integrate the Deno language server with your editor:
// https://deno.land/manual/getting_started/setup_your_environment
// This enables autocomplete, go to definition, etc.

import {
  createClient,
  SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { GameInfo } from "../../../shared/GameInfo.ts";
import { JoinRequest } from "../../../shared/JoinRequest.ts";
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

    // get request body as json
    const body = await req.json() as JoinRequest;

    // if body.gameId is not a string, return 400
    if (typeof body.gameId !== "string") {
      return new Response("Bad Request", { status: 400 });
    }

    // if user is not authenticated, return 401
    if (!user || !user.data.user) {
      return new Response("Unauthorized", { status: 401 });
    }

    // find game by id
    const { data: games, error } = await supabase.from("games").select("*").eq(
      "id",
      body.gameId,
    );

    if (error) throw error;

    // if game not found, return 404
    if (!games || games.length === 0) {
      return new Response("Not Found", { status: 404 });
    }

    // if game already has two players, return 400
    if (games[0].other) {
      return new Response("Bad Request", { status: 400 });
    }

    // update game with other player
    const { data, error: updateError } = await supabase.from("games").update({
      other: user.data.user.id,
    }).eq("id", body.gameId);

    if (updateError) throw updateError;

    // return updated game
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
