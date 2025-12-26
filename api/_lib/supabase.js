// =====================================================
// SUPABASE CLIENT - SERVERLESS SHARED
// =====================================================

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// =====================================================
// CACHED INTEGRATION SETTINGS
// =====================================================

let cachedGeminiApiKey = null;
let cachedIntegrations = null;
let integrationsFetchTime = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 dakika cache

export async function getCachedGeminiApiKey() {
  const now = Date.now();

  if (cachedGeminiApiKey && integrationsFetchTime && (now - integrationsFetchTime) < CACHE_DURATION) {
    return cachedGeminiApiKey;
  }

  try {
    const { data } = await supabase
      .from('integrations')
      .select('voice_order_gemini_api_key')
      .single();

    cachedGeminiApiKey = data?.voice_order_gemini_api_key || null;
    integrationsFetchTime = now;

    return cachedGeminiApiKey;
  } catch (e) {
    console.error('API key alınamadı:', e.message);
    return null;
  }
}

export async function refreshIntegrationsCache() {
  cachedGeminiApiKey = null;
  cachedIntegrations = null;
  integrationsFetchTime = null;
  return await getCachedGeminiApiKey();
}
