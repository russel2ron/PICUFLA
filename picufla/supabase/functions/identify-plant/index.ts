import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const RATE_LIMIT_PER_HOUR = 10

serve(async (req) => {
  try {
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders })
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    const token = authHeader.slice(7)

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: rateLimit } = await supabaseClient
      .from('rate_limits')
      .select('call_count, window_start')
      .eq('user_id', user.id)
      .maybeSingle()

    const now = new Date().toISOString()

    if (rateLimit) {
      const windowStart = new Date(rateLimit.window_start).getTime()
      const oneHourAgo = Date.now() - 60 * 60 * 1000

      if (windowStart > oneHourAgo && rateLimit.call_count >= RATE_LIMIT_PER_HOUR) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. You can identify up to 10 plants per hour.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
        )
      }

      if (windowStart <= oneHourAgo) {
        await supabaseClient.from('rate_limits').upsert({
          user_id: user.id,
          call_count: 1,
          window_start: now,
        })
      } else {
        await supabaseClient.from('rate_limits').upsert({
          user_id: user.id,
          call_count: rateLimit.call_count + 1,
          window_start: rateLimit.window_start,
        })
      }
    } else {
      await supabaseClient.from('rate_limits').insert({
        user_id: user.id,
        call_count: 1,
        window_start: now,
      })
    }

    let body: { imageBase64?: string; mimeType?: string }
    try {
      body = await req.json()
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid request body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { imageBase64, mimeType } = body

    if (!imageBase64 || typeof imageBase64 !== 'string' || imageBase64.length === 0) {
      return new Response(JSON.stringify({ error: 'imageBase64 is required and must be a non-empty string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!mimeType || !['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) {
      return new Response(JSON.stringify({ error: 'mimeType must be one of: image/jpeg, image/png, image/webp' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const decodedSize = imageBase64.length * 3 / 4
    if (decodedSize > 4_000_000) {
      return new Response(JSON.stringify({ error: 'Image size exceeds 4MB limit' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: 800,
        messages: [
          {
            role: 'system',
            content: `You are a professional botanist and plant identification expert.
Analyze the provided plant image and return ONLY a valid JSON object.
No markdown, no explanation, no extra text — just the JSON object.

If you can identify the plant with confidence >= 0.6:
{"identified":true,"common_name":"string","scientific_name":"string","confidence_score":number,"description":"2-3 sentences","origin":"string","care_watering":"string","care_sunlight":"string","care_soil":"string","uses":"string","alternatives":null}

If confidence is 0.3–0.59, include the top match AND up to 2 alternatives:
{"identified":true,...same fields...,"alternatives":[{"common_name":"string","scientific_name":"string","confidence_score":number}]}

If the image has no visible plant or confidence < 0.3:
{"identified":false,"error":"Could not identify the plant. Try better lighting or a closer shot."}

All confidence_score values are between 0.0 and 1.0.`,
          },
          {
            role: 'user',
            content: [
              { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
              { type: 'text', text: 'Identify this plant.' },
            ],
          },
        ],
      }),
      signal: AbortSignal.timeout(25000),
    })

    if (!openaiResponse.ok) {
      if (Deno.env.get('SUPABASE_ENV') !== 'production') {
        console.error('OpenAI API error:', openaiResponse.status, await openaiResponse.text())
      }
      return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const openaiData = await openaiResponse.json()
    let parsed: Record<string, unknown>

    try {
      parsed = JSON.parse(openaiData.choices[0].message.content)
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid response from identification service.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (parsed.identified === false) {
      await supabaseClient.from('identification_logs').insert({
        user_id: user.id,
        image_storage_path: '',
        identified_plant_scientific_name: null,
        confidence_score: null,
        alternatives: null,
        was_accepted: false,
      })

      return new Response(JSON.stringify({ identified: false, error: parsed.error }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const requiredFields = ['common_name', 'scientific_name', 'confidence_score', 'description', 'origin', 'care_watering', 'care_sunlight', 'care_soil', 'uses']
    for (const field of requiredFields) {
      if (parsed[field] === undefined || parsed[field] === null) {
        return new Response(JSON.stringify({ error: 'Invalid response from identification service.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    }

    const result = {
      identified: true,
      common_name: String(parsed.common_name),
      scientific_name: String(parsed.scientific_name),
      confidence_score: Math.max(0, Math.min(1, Number(parsed.confidence_score))),
      description: String(parsed.description),
      origin: String(parsed.origin),
      care_watering: String(parsed.care_watering),
      care_sunlight: String(parsed.care_sunlight),
      care_soil: String(parsed.care_soil),
      uses: String(parsed.uses),
      alternatives: Array.isArray(parsed.alternatives) ? parsed.alternatives : null,
    }

    await supabaseClient.from('identification_logs').insert({
      user_id: user.id,
      image_storage_path: '',
      identified_plant_scientific_name: result.scientific_name,
      confidence_score: result.confidence_score,
      alternatives: result.alternatives,
      was_accepted: false,
    })

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    if (Deno.env.get('SUPABASE_ENV') !== 'production') {
      console.error(err)
    }
    return new Response(JSON.stringify({ error: 'Something went wrong. Please try again.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
