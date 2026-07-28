import { ReactNode } from 'react';
import { useCopilotStore } from './useCopilotStore';

interface CopilotStoreProviderProps {
  children: ReactNode;
}

export default function CopilotStoreProvider({ children }: CopilotStoreProviderProps) {
  // The store is initialized when the provider is created
  // This ensures the store is available throughout the app
  useCopilotStore();
  
  return <>{children}</>;
}