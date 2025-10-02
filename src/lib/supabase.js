import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://vabdpfalswqxhlvwigky.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZhYmRwZmFsc3dxeGhsdndpZ2t5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkxNDExNTEsImV4cCI6MjA3NDcxNzE1MX0.LVTj_nY514cpEPG3v3Qqtrpxe1eupGFZW6LwiHfbx5M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
