import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://qgfzebadrkgzxnmmmmbfj.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_H6eS9qSQtRFbHd7q4zzdNg_EShYeS_F'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
