import React, { useState, useEffect } from 'react';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface SearchProgressIndicatorProps {
  isSearching: boolean;
}

export default function SearchProgressIndicator({ isSearching }: SearchProgressIndicatorProps) {
  const [logMessages, setLogMessages] = useState<string[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [expanded, setExpanded] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [completionMessage, setCompletionMessage] = useState<string | null>(null);
  
  // Listen for console logs and capture relevant search messages
  useEffect(() => {
    if (!isSearching) {
      setLogMessages([]);
      setCurrentIndex(0);
      return;
    }
    
    const originalConsoleLog = console.log;
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    // Helper function to process a message and add it to logs if relevant
    const processMessage = (message: string, isError = false) => {
      // Only capture search-related logs with relevant keywords
      if (
        message.includes('search') || 
        message.includes('query') || 
        message.includes('API') || 
        message.includes('Perplexity') ||
        message.includes('contacts') ||
        message.includes('companies') ||
        message.includes('parsing') ||
        message.includes('formatting') ||
        message.includes('analyzing') ||
        message.includes('processing') ||
        message.includes('enriching') ||
        message.includes('discovering') ||
        message.includes('error') ||
        message.includes('failed') ||
        message.includes('failure') ||
        isError
      ) {
        // Clean up the message - remove quotes, brackets, etc.
        const cleanMessage = message
          .replace(/["[\]{}]/g, '')
          .replace(/,/g, ' ')
          .trim();
        
        // Format errors differently
        const formattedMessage = isError ? `🔴 Error: ${cleanMessage}` : cleanMessage;
        
        setLogMessages(prev => {
          // Only add if it's a new message
          if (prev.includes(formattedMessage)) return prev;
          return [...prev, formattedMessage];
        });
      }
    };
    
    // Override console.log
    console.log = (...args) => {
      originalConsoleLog(...args);
      const message = args.join(' ');
      processMessage(message);
    };
    
    // Override console.error to capture errors
    console.error = (...args) => {
      originalConsoleError(...args);
      const message = args.join(' ');
      processMessage(message, true);
    };
    
    // Override console.warn to capture warnings
    console.warn = (...args) => {
      originalConsoleWarn(...args);
      const message = args.join(' ');
      processMessage(message, true);
    };
    
    return () => {
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, [isSearching]);
  
  // Detect completion of search
  useEffect(() => {
    if (!isSearching && logMessages.length > 0) {
      // Check if search is complete based on certain messages
      const lastMessages = logMessages.slice(-5);
      const isSearchComplete = lastMessages.some(msg => 
        msg.includes("Search process completed") || 
        msg.includes("completed successfully") || 
        msg.includes("Complete results received")
      );
      
      if (isSearchComplete) {
        setIsComplete(true);
        
        // Sequence of completion messages with timing
        setCompletionMessage("Search complete! 🎉");
        
        setTimeout(() => {
          setCompletionMessage("Click on a company to see the contacts. 👀");
          
          setTimeout(() => {
            setCompletionMessage("Click \"Find Key Emails\" button to find emails of decision-makers.");
            
            // Keep showing the last message for 12 seconds
          }, 12000);
        }, 3000);
      }
    } else if (isSearching) {
      setIsComplete(false);
      setCompletionMessage(null);
    }
  }, [isSearching, logMessages]);
  
  // Cycle through messages with minimum display time
  useEffect(() => {
    if (!logMessages.length || !isSearching || isComplete) return;
    
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % logMessages.length);
    }, 2000); // Show each message for 2 seconds minimum
    
    return () => clearInterval(interval);
  }, [logMessages, isSearching, isComplete]);
  
  // Keep indicator visible for 10 minutes after completion
  const [hideTimeout, setHideTimeout] = useState<NodeJS.Timeout | null>(null);
  
  useEffect(() => {
    if (isComplete && hideTimeout === null) {
      const timeout = setTimeout(() => {
        setIsComplete(false);
        setCompletionMessage(null);
      }, 10 * 60 * 1000); // 10 minutes in milliseconds
      
      setHideTimeout(timeout);
      
      return () => {
        if (timeout) clearTimeout(timeout);
      };
    }
  }, [isComplete, hideTimeout]);

  if ((!isSearching && !isComplete) || (!logMessages.length && !completionMessage)) return null;
  
  return (
    <div className="mt-2 rounded-md border border-slate-200 bg-slate-50 p-3 text-sm transition-all duration-300">
      <div className="flex items-center">
        {isComplete ? (
          <CheckCircle2 className="mr-2 h-5 w-5 text-blue-500" />
        ) : (
          <Loader2 className="mr-2 h-5 w-5 animate-spin text-blue-500" />
        )}
        
        <div className={`flex-1 truncate font-medium ${
          completionMessage 
            ? 'text-blue-700' 
            : logMessages[currentIndex]?.includes('Error:') 
              ? 'text-red-800' 
              : 'text-indigo-600'
        }`}>
          {completionMessage || logMessages[currentIndex]}
        </div>
        
        {!isComplete && (
          <button 
            onClick={() => setExpanded(!expanded)} 
            className="ml-2 rounded px-2 py-0.5 text-xs bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
          >
            {expanded ? 'Hide' : 'More'}
          </button>
        )}
      </div>
      
      {expanded && !isComplete && (
        <div className="mt-2 max-h-36 overflow-y-auto border-t border-slate-100 pt-2">
          {logMessages.map((msg, i) => (
            <div 
              key={i} 
              className={`px-2 py-1 mb-1 rounded-sm ${
                msg.includes('Error:') 
                  ? 'bg-red-50 text-red-800 border-l-2 border-red-500' 
                  : i === currentIndex 
                    ? 'bg-blue-50 border-l-2 border-blue-400' 
                    : 'border-l-2 border-transparent'
              }`}
            >
              {msg}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}