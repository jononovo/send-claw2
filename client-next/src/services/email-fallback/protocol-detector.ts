/**
 * Protocol Detection Service
 * Attempts to detect if mailto links succeed and triggers fallbacks when necessary
 */

import { EmailMethod } from './environment-detector';

export interface DetectionResult {
  success: boolean;
  method: EmailMethod;
  timeElapsed: number;
  fallbackNeeded: boolean;
}

export class ProtocolDetector {
  private static readonly DEFAULT_TIMEOUT = 1500;
  private static readonly BLUR_DETECTION_DELAY = 100;
  private static readonly FOCUS_RETURN_DELAY = 500;
  
  /**
   * Detect if mailto link was successfully handled
   * Uses window blur/focus events as indicators
   */
  static async detectMailtoSuccess(
    mailtoUrl: string,
    timeout: number = this.DEFAULT_TIMEOUT
  ): Promise<DetectionResult> {
    const startTime = Date.now();
    
    return new Promise((resolve) => {
      let hasBlurred = false;
      let hasFocused = false;
      let timeoutId: NodeJS.Timeout;
      
      // Handler for window blur (indicates email client likely opened)
      const handleBlur = () => {
        hasBlurred = true;
        console.log('Window blurred - email client likely opened');
        
        // Don't resolve immediately - wait to see if focus returns quickly
        setTimeout(() => {
          if (!hasFocused) {
            cleanup();
            resolve({
              success: true,
              method: 'mailto',
              timeElapsed: Date.now() - startTime,
              fallbackNeeded: false
            });
          }
        }, this.BLUR_DETECTION_DELAY);
      };
      
      // Handler for window focus (user might have cancelled)
      const handleFocus = () => {
        hasFocused = true;
        
        if (hasBlurred && Date.now() - startTime > this.FOCUS_RETURN_DELAY) {
          // User returned after blur - likely interacted with email client
          console.log('Window refocused after blur - email client interaction detected');
          cleanup();
          resolve({
            success: true,
            method: 'mailto',
            timeElapsed: Date.now() - startTime,
            fallbackNeeded: false
          });
        }
      };
      
      // Handler for visibility change (mobile browsers)
      const handleVisibilityChange = () => {
        if (document.hidden) {
          // Page hidden - likely email app opened
          hasBlurred = true;
          console.log('Page hidden - email app likely opened (mobile)');
        } else if (hasBlurred) {
          // Page visible again after being hidden
          hasFocused = true;
          cleanup();
          resolve({
            success: true,
            method: 'mailto',
            timeElapsed: Date.now() - startTime,
            fallbackNeeded: false
          });
        }
      };
      
      // Cleanup function
      const cleanup = () => {
        window.removeEventListener('blur', handleBlur);
        window.removeEventListener('focus', handleFocus);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
        clearTimeout(timeoutId);
      };
      
      // Set up event listeners
      window.addEventListener('blur', handleBlur);
      window.addEventListener('focus', handleFocus);
      document.addEventListener('visibilitychange', handleVisibilityChange);
      
      // Attempt to open mailto link
      try {
        window.location.href = mailtoUrl;
      } catch (error) {
        console.error('Failed to open mailto link:', error);
        cleanup();
        resolve({
          success: false,
          method: 'mailto',
          timeElapsed: Date.now() - startTime,
          fallbackNeeded: true
        });
        return;
      }
      
      // Set timeout for detection
      timeoutId = setTimeout(() => {
        const success = hasBlurred || document.hidden;
        console.log(`Mailto detection timeout - success: ${success}`);
        cleanup();
        resolve({
          success,
          method: 'mailto',
          timeElapsed: Date.now() - startTime,
          fallbackNeeded: !success
        });
      }, timeout);
    });
  }
  
  /**
   * Detect if web-based email service opened successfully
   * Simpler detection for web URLs
   */
  static async detectWebEmailSuccess(
    url: string,
    method: 'gmail' | 'outlook' | 'yahoo'
  ): Promise<DetectionResult> {
    const startTime = Date.now();
    
    try {
      const newWindow = window.open(url, '_blank', 'noopener,noreferrer');
      
      // Check if window opened successfully
      if (newWindow) {
        // Small delay to ensure window is opening
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Check if window is still open (not blocked)
        const isOpen = !newWindow.closed;
        
        return {
          success: isOpen,
          method,
          timeElapsed: Date.now() - startTime,
          fallbackNeeded: !isOpen
        };
      } else {
        // Popup blocked
        console.log('Popup blocked - fallback needed');
        return {
          success: false,
          method,
          timeElapsed: Date.now() - startTime,
          fallbackNeeded: true
        };
      }
    } catch (error) {
      console.error(`Failed to open ${method} compose window:`, error);
      return {
        success: false,
        method,
        timeElapsed: Date.now() - startTime,
        fallbackNeeded: true
      };
    }
  }
  
  /**
   * Test if a protocol is available
   * Uses iframe method for better compatibility
   */
  static async isProtocolAvailable(
    protocol: string,
    timeout: number = 1000
  ): Promise<boolean> {
    return new Promise((resolve) => {
      const iframe = document.createElement('iframe');
      iframe.style.display = 'none';
      
      let timeoutId: NodeJS.Timeout;
      let resolved = false;
      
      const cleanup = () => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeoutId);
          if (iframe.parentNode) {
            document.body.removeChild(iframe);
          }
        }
      };
      
      const handleBlur = () => {
        cleanup();
        resolve(true);
      };
      
      window.addEventListener('blur', handleBlur, { once: true });
      
      timeoutId = setTimeout(() => {
        window.removeEventListener('blur', handleBlur);
        cleanup();
        resolve(false);
      }, timeout);
      
      document.body.appendChild(iframe);
      
      try {
        iframe.src = protocol;
      } catch (error) {
        window.removeEventListener('blur', handleBlur);
        cleanup();
        resolve(false);
      }
    });
  }
  
  /**
   * Smart detection that tries multiple methods
   */
  static async detectWithFallback(
    primaryMethod: EmailMethod,
    emailOptions: any
  ): Promise<DetectionResult> {
    let result: DetectionResult;
    
    switch (primaryMethod) {
      case 'mailto':
        // Try mailto first
        const { EmailLinkGenerator } = await import('./email-link-generator');
        const mailtoUrl = EmailLinkGenerator.generateMailtoLink(emailOptions);
        result = await this.detectMailtoSuccess(mailtoUrl);
        
        if (!result.success) {
          // Mailto failed, suggest web fallback
          result.fallbackNeeded = true;
        }
        break;
      
      case 'gmail':
      case 'outlook':
      case 'yahoo':
        // Try web-based email
        const { EmailLinkGenerator: Generator } = await import('./email-link-generator');
        let url: string;
        
        switch (primaryMethod) {
          case 'gmail':
            url = Generator.generateGmailUrl(emailOptions);
            break;
          case 'outlook':
            url = Generator.generateOutlookUrl(emailOptions);
            break;
          case 'yahoo':
            url = Generator.generateYahooUrl(emailOptions);
            break;
        }
        
        result = await this.detectWebEmailSuccess(url!, primaryMethod);
        break;
      
      case 'copy':
        // Copy always succeeds if clipboard API is available
        result = {
          success: true,
          method: 'copy',
          timeElapsed: 0,
          fallbackNeeded: false
        };
        break;
      
      default:
        result = {
          success: false,
          method: primaryMethod,
          timeElapsed: 0,
          fallbackNeeded: true
        };
    }
    
    return result;
  }
}