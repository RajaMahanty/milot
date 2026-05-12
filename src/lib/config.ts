/**
 * Centralized configuration and environment variable validation.
 */

const getEnv = (key: string, defaultValue?: string): string => {
  const value = process.env[key] || defaultValue;
  
  if (value === undefined && process.env.NODE_ENV === 'production') {
    // In production, we want to know immediately if a critical variable is missing
    console.error(`CRITICAL ERROR: Environment variable ${key} is missing in production.`);
  }
  
  return value || '';
};

export const config = {
  firebase: {
    apiKey: getEnv('NEXT_PUBLIC_FIREBASE_API_KEY'),
    authDomain: getEnv('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN'),
    projectId: getEnv('NEXT_PUBLIC_FIREBASE_PROJECT_ID'),
    storageBucket: getEnv('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET'),
    messagingSenderId: getEnv('NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID'),
    appId: getEnv('NEXT_PUBLIC_FIREBASE_APP_ID'),
    measurementId: getEnv('NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID'),
  },
  ai: {
    openRouterApiKey: getEnv('OPENROUTER_API_KEY'),
    defaultModel: 'openai/gpt-4o-mini',
  },
  isProduction: process.env.NODE_ENV === 'production',
  isDevelopment: process.env.NODE_ENV === 'development',
};

// Validation check
export const validateConfig = () => {
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

  if (!config.ai.openRouterApiKey) {
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
