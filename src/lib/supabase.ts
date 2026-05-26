import { createClient } from '@supabase/supabase-js';

// Hardcoded for direct compatibility with external deployment environments like Vercel
const supabaseUrl = 'https://kakajgutoozjcoqeochb.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtha2FqZ3V0b296amNvcWVvY2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NjI5MzEsImV4cCI6MjA5NTMzODkzMX0.2WbsgpOjVDrxn8oEwiLafBo1lS-HixPJCFoo7TuepKc';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
