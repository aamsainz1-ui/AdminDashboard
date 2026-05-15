import { createClient } from '@supabase/supabase-js';

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL || 'https://uipcifmovofxbrrqnmrn.supabase.co').trim();
const supabaseAnonKey = (import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InVpcGNpZm1vdm9meGJycnFubXJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4MjIwMTIsImV4cCI6MjA4OTM5ODAxMn0.uhi2znO4CQGIYv4zXKRsHgJyDfw-iGpc01-7SsYzmq8').trim();

if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('Supabase credentials not found. Running in offline mode.');
}

export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;
export const isOnline = !!supabase;
