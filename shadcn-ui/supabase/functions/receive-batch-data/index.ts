// Supabase Edge Function to receive batch counter data
// This function will be accessible at: https://orsdqaeqqobltrmpvtmj.supabase.co/functions/v1/receive-batch-data
// This URL is your PERMANENT IP/URL that you can configure in your batch counter

import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Parse request body
    const body = await req.json()
    
    // Validate required fields
    if (!body.machine_id || body.batch_count === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: machine_id and batch_count' }),
        { 
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Prepare data for insertion
    const batchData = {
      machine_id: body.machine_id,
      batch_count: parseInt(body.batch_count),
      production_rate: body.production_rate ? parseFloat(body.production_rate) : null,
      status: body.status || 'running',
      metadata: body.metadata || {},
      timestamp: body.timestamp ? new Date(body.timestamp).toISOString() : new Date().toISOString()
    }

    // Insert data into Supabase
    const { data, error } = await supabaseClient
      .from('batch_counter_data')
      .insert([batchData])
      .select()

    if (error) {
      console.error('Error inserting batch data:', error)
      return new Response(
        JSON.stringify({ error: error.message }),
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Batch data received successfully',
        data: data[0]
      }),
      { 
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Error processing request:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})


