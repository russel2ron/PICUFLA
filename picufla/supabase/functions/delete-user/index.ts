import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.slice(7);

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: { confirmationText?: string; deletionType?: string };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const confirmationText = (body.confirmationText ?? '').trim();
    const deletionType = body.deletionType;

    if (confirmationText !== 'DELETE' || !['account', 'plant_data'].includes(deletionType ?? '')) {
      return new Response(JSON.stringify({ error: 'Invalid request.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const now = new Date().toISOString();
    const purgeAfter = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    if (deletionType === 'account') {
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({ is_deleted: true, deleted_at: now })
        .eq('id', user.id);

      if (updateError) {
        return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      try {
        await supabaseClient.auth.admin.signOut(user.id, 'global');
      } catch {
        // Non-critical — user data is already flagged
      }
    }

    if (deletionType === 'plant_data') {
      const { error: updateError } = await supabaseClient
        .from('user_plants')
        .update({ is_deleted: true })
        .eq('user_id', user.id);

      if (updateError) {
        return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    const { error: auditError } = await supabaseClient
      .from('deletion_audit_log')
      .insert({
        user_id: user.id,
        deletion_type: deletionType,
        requested_at: now,
        purge_after: purgeAfter,
      });

    if (auditError) {
      // Non-critical — main operation already succeeded
    }

    const message =
      deletionType === 'account'
        ? 'Account scheduled for deletion. All data will be purged within 30 days.'
        : 'Plant data scheduled for deletion within 30 days.';

    return new Response(
      JSON.stringify({ success: true, message, purge_after: purgeAfter }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    if (Deno.env.get('SUPABASE_ENV') !== 'production') {
      console.error(err);
    }
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
