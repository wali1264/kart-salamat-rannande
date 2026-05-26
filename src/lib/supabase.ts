import { createClient } from '@supabase/supabase-js';

// Hardcoded for direct compatibility with external deployment environments like Vercel
const supabaseUrl = 'https://olhqqqpvcafepfccxudg.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9saHFxcXB2Y2FmZXBmY2N4dWRnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4MjI5MDQsImV4cCI6MjA5MjM5ODkwNH0.VxgYgvXs_WG8V1YD4d_FUuSGS2-393AIo8b5XYMV3oA';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
