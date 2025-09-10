export const SUPABASE_CONFIG = {
  url: import.meta.env.VITE_SUPABASE_URL,
  anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
  timeout: 30000, // 30 segundos
  retries: 3,
  retryDelay: 1000, // 1 segundo
};

// Validar configuración
export function validateSupabaseConfig() {
  const { url, anonKey } = SUPABASE_CONFIG;
  
  if (!url || !anonKey) {
    throw new Error('Missing required Supabase environment variables');
  }
  
  // Validar formato de URL
  try {
    new URL(url);
  } catch {
    throw new Error('Invalid VITE_SUPABASE_URL format');
  }
  
  // Validar formato de JWT (básico)
  if (!anonKey.startsWith('eyJ')) {
    throw new Error('Invalid VITE_SUPABASE_ANON_KEY format');
  }
  
  return true;
}

// Helper para logging de errores de conexión
export function logConnectionError(error: any, context: string) {
  console.error(`[Supabase ${context}]`, {
    message: error?.message || 'Unknown error',
    code: error?.code,
    status: error?.status,
    timestamp: new Date().toISOString()
  });
}