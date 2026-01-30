import { useState, useEffect, useCallback } from 'react';

interface UseEmailSendStateProps {
  id?: string | number | null;
}

/**
 * Hook to manage email send state across Gmail API and manual sends.
 * Automatically resets state when the ID changes (e.g., switching contacts/items).
 */
export function useEmailSendState({ id }: UseEmailSendStateProps = {}) {
  const [isSent, setIsSent] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Reset state when ID changes (new contact/item)
  useEffect(() => {
    setIsSent(false);
    setIsSending(false);
  }, [id]);

  const markPending = useCallback(() => {
    setIsSending(true);
    setIsSent(false);
  }, []);

  const markSent = useCallback(() => {
    setIsSending(false);
    setIsSent(true);
  }, []);

  const reset = useCallback(() => {
    setIsSending(false);
    setIsSent(false);
  }, []);

  return {
    isSent,
    isSending,
    markPending,
    markSent,
    reset,
  };
}