/**
 * Centralized configuration and environment variable validation.
 */

const getEnv = (key: string, value: string | undefined, defaultValue?: string): string => {
  const finalValue = value || defaultValue;
  const isServer = typeof window === 'undefined';
  const isPublic = key.startsWith('NEXT_PUBLIC_');
  
  // Only log missing variable errors if we are in the environment where they should exist
  if (finalValue === undefined && process.env.NODE_ENV === 'production') {
    if (isServer || isPublic) {
      console.error(`CRITICAL ERROR: Environment variable ${key} is missing in production.`);
    }
  }
  
  return finalValue || '';
};

export const config = {
  firebase: {
    apiKey: getEnv('NEXT_PUBLIC_FIREBASE_API_KEY', process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
    authDomain: getEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
    projectId: getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID', process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
    storageBucket: getEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: getEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID', process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID),
    appId: getEnv('NEXT_PUBLIC_FIREBASE_APP_ID', process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
    measurementId: getEnv('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID', process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
  },
  ai: {
    // API keys shouldn't be exposed to the client, but keeping it in config for server routes
    openRouterApiKey: getEnv('OPENROUTER_API_KEY', process.env.OPENROUTER_API_KEY),
    defaultModel: 'openai/gpt-4o-mini',
  },
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
};

// Validation check
export const validateConfig = () => {
  const isServer = typeof window === 'undefined';
  
  const requiredFirebaseKeys = [
    'apiKey',
    'authDomain',
    'projectId',
    'storageBucket',
    'messagingSenderId',
    'appId'
  ] as const;

  const missingKeys: string[] = [];

  requiredFirebaseKeys.forEach((key) => {
    if (!config.firebase[key]) {
      missingKeys.push(`NEXT_PUBLIC_FIREBASE_${key.toUpperCase()}`);
    }
  });

  // ONLY validate the AI API key on the server. 
  // It will always be missing on the client because it's a secret.
  if (isServer && !config.ai.openRouterApiKey) {
    missingKeys.push('OPENROUTER_API_KEY');
  }

  if (missingKeys.length > 0) {
    const message = `Missing required environment variables: ${missingKeys.join(', ')}`;
    if (config.isProduction) {
      throw new Error(message);
    } else {
      console.warn(message);
    }
  }
};
