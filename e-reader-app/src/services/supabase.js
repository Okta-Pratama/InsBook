import 'react-native-url-polyfill/auto';
import { createClient } from '@supabase/supabase-js';

// TODO: Replace these with your actual Supabase project URL and anon key
const SUPABASE_URL = 'https://dyqvlxpfgdxmrvrlwymd.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_bIA3PtpncZv9ksIMrxALNQ_3ylwiIYm';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
