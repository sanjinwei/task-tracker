'use client';

import { useEffect, useState } from 'react';
import { getOpenAIApiKey, getDeepSeekApiKey } from '@/app/settings/actions';

export default function ApiKeyCheck() {
  const [apiKeyStatus, setApiKeyStatus] = useState<'checking' | 'available' | 'missing'>('checking');
  const [availableProvider, setAvailableProvider] = useState<string | null>(null);

  useEffect(() => {
    // Check if any API key is available from Settings table
    const checkApiKey = async () => {
      try {
        const { value: openAIKey } = await getOpenAIApiKey();
        if (openAIKey && openAIKey.trim() !== '') {
          setApiKeyStatus('available');
          setAvailableProvider('OpenAI');
          return;
        }

        const { value: deepSeekKey } = await getDeepSeekApiKey();
        if (deepSeekKey && deepSeekKey.trim() !== '') {
          setApiKeyStatus('available');
          setAvailableProvider('DeepSeek');
          return;
        }

        setApiKeyStatus('missing');
      } catch (error) {
        console.error('Error checking API key:', error);
        setApiKeyStatus('missing');
      }
    };

    checkApiKey();
  }, []);

  if (apiKeyStatus === 'checking') {
    return null;
  }

  if (apiKeyStatus === 'available') {
    return (
      <div className="bg-green-50 border-l-4 border-green-400 p-4 mb-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-700">
              <strong className="font-medium">{availableProvider} API Key Found</strong>
              <br />
              AI features are ready to use with {availableProvider}.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-4">
      <div className="flex">
        <div className="flex-shrink-0">
          <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="ml-3">
          <p className="text-sm text-yellow-700">
            <strong className="font-medium">No AI API Key Found</strong>
            <br />
            No OpenAI or DeepSeek API key was found in the system settings.
            <br />
            Go to Settings → AI Config to add an API key (OpenAI or DeepSeek).
          </p>
        </div>
      </div>
    </div>
  );
}
