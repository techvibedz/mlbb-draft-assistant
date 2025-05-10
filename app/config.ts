export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'https://mlbb-draft-assistant-laf4mojsn-houdeifas-projects.vercel.app/api',
  isProduction: process.env.NODE_ENV === 'production'
} 