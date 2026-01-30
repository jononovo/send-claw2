import { useState, useCallback } from 'react';
import { useMutation } from '@tanstack/react-query';
import { chatService } from '../services';
import type { 
  OnboardingChatMessage, 
  OnboardingChatResponse,
  TEmailGenerationWorkflow 
} from '../types';

/**
 * Custom hook for managing strategy chat interactions
 */
export function useStrategyChat() {
  const [messages, setMessages] = useState<OnboardingChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [workflow, setWorkflow] = useState<TEmailGenerationWorkflow>('product_analysis');

  // Mutation for sending chat messages
  const sendMessageMutation = useMutation({
    mutationFn: async ({ 
      message, 
      boundaryContext 
    }: { 
      message: string; 
      boundaryContext?: any 
    }) => {
      return chatService.sendChatMessage(
        message,
        workflow,
        messages,
        boundaryContext
      );
    },
    onSuccess: (response: OnboardingChatResponse) => {
      // Add user message
      setMessages(prev => [...prev, {
        sender: 'user',
        content: response.userMessage || '',
        timestamp: new Date().toISOString()
      }]);

      // Add AI response
      if (response.aiResponse) {
        setMessages(prev => [...prev, {
          sender: 'ai',
          content: response.aiResponse,
          timestamp: new Date().toISOString()
        }]);
      }
    }
  });

  const sendMessage = useCallback(async (
    message: string, 
    boundaryContext?: any
  ) => {
    setIsLoading(true);
    try {
      await sendMessageMutation.mutateAsync({ message, boundaryContext });
    } finally {
      setIsLoading(false);
    }
  }, [sendMessageMutation]);

  const resetChat = useCallback(() => {
    setMessages([]);
    setWorkflow('product_analysis');
  }, []);

  const changeWorkflow = useCallback((newWorkflow: TEmailGenerationWorkflow) => {
    setWorkflow(newWorkflow);
    // Optionally reset messages when workflow changes
    setMessages([]);
  }, []);

  return {
    messages,
    isLoading,
    workflow,
    sendMessage,
    resetChat,
    changeWorkflow,
    setMessages
  };
}