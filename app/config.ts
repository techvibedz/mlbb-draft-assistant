export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://mlbb-draft-assistant-backend.up.railway.app',
  isProduction: process.env.NODE_ENV === 'production'
} 