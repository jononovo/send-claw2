/**
 * Environment Detection Service
 * Detects browser, OS, and platform capabilities for intelligent email fallback handling
 */

export type OS = 'ios' | 'android' | 'windows' | 'macos' | 'linux' | 'unknown';
export type Browser = 'chrome' | 'safari' | 'firefox' | 'edge' | 'unknown';
export type EmailMethod = 'mailto' | 'gmail' | 'outlook' | 'yahoo' | 'copy';

export interface EnvironmentInfo {
  os: OS;
  browser: Browser;
  isMobile: boolean;
  isTablet: boolean;
  isInIframe: boolean;
  hasEmailClient: boolean;
  supportedMethods: EmailMethod[];
  userAgent: string;
  platform: string;
}

export class EnvironmentDetector {
  private static instance: EnvironmentDetector;
  private cachedInfo: EnvironmentInfo | null = null;

  static getInstance(): EnvironmentDetector {
    if (!EnvironmentDetector.instance) {
      EnvironmentDetector.instance = new EnvironmentDetector();
    }
    return EnvironmentDetector.instance;
  }

  detect(forceRefresh = false): EnvironmentInfo {
    if (this.cachedInfo && !forceRefresh) {
      return this.cachedInfo;
    }

    const ua = navigator.userAgent;
    const platform = navigator.platform || '';
    
    this.cachedInfo = {
      os: this.detectOS(ua, platform),
      browser: this.detectBrowser(ua),
      isMobile: this.isMobileDevice(ua),
      isTablet: this.isTabletDevice(ua),
      isInIframe: this.isInIframe(),
      hasEmailClient: this.guessEmailClientAvailability(ua, platform),
      supportedMethods: this.getSupportedMethods(ua, platform),
      userAgent: ua,
      platform: platform
    };

    return this.cachedInfo;
  }

  private detectOS(ua: string, platform: string): OS {
    // iOS detection (iPhone, iPad, iPod)
    if (/iPad|iPhone|iPod/.test(ua) && !(window as any).MSStream) {
      return 'ios';
    }
    
    // Android detection
    if (/Android/i.test(ua)) {
      return 'android';
    }
    
    // Windows detection
    if (/Win/i.test(platform) || /Windows/i.test(ua)) {
      return 'windows';
    }
    
    // macOS detection
    if (/Mac/i.test(platform) && !/iPhone|iPad|iPod/.test(ua)) {
      return 'macos';
    }
    
    // Linux detection
    if (/Linux/i.test(platform) && !/Android/i.test(ua)) {
      return 'linux';
    }
    
    return 'unknown';
  }

  private detectBrowser(ua: string): Browser {
    // Order matters - some browsers include others in their UA
    
    // Edge detection (new Chromium-based)
    if (/Edg/i.test(ua)) {
      return 'edge';
    }
    
    // Chrome detection (must come after Edge)
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua) && !/OPR/i.test(ua)) {
      return 'chrome';
    }
    
    // Firefox detection
    if (/Firefox/i.test(ua)) {
      return 'firefox';
    }
    
    // Safari detection (must come after Chrome)
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua) && !/CriOS/i.test(ua)) {
      return 'safari';
    }
    
    return 'unknown';
  }

  private isMobileDevice(ua: string): boolean {
    return /Mobile|Android|iPhone|iPod/i.test(ua);
  }

  private isTabletDevice(ua: string): boolean {
    return /iPad|Android.*Tablet|Tablet.*Android/i.test(ua) && !/Mobile/i.test(ua);
  }

  private isInIframe(): boolean {
    try {
      return window.self !== window.top;
    } catch (e) {
      // If access is blocked, we're likely in a cross-origin iframe
      return true;
    }
  }

  private guessEmailClientAvailability(ua: string, platform: string): boolean {
    const os = this.detectOS(ua, platform);
    
    // Mobile devices almost always have email apps
    if (os === 'ios' || os === 'android') {
      return true;
    }
    
    // Desktop less certain - many users only use webmail
    if (os === 'windows' || os === 'macos' || os === 'linux') {
      // Assume 50/50 chance on desktop
      return false;
    }
    
    return false;
  }

  private getSupportedMethods(ua: string, platform: string): EmailMethod[] {
    const os = this.detectOS(ua, platform);
    const browser = this.detectBrowser(ua);
    const methods: EmailMethod[] = [];
    
    // Mailto is supported everywhere but reliability varies
    methods.push('mailto');
    
    // Web-based email services work everywhere with internet
    methods.push('gmail', 'outlook', 'yahoo');
    
    // Copy to clipboard as universal fallback
    methods.push('copy');
    
    // Special handling for specific environments
    if (os === 'ios' && browser === 'safari') {
      // iOS Safari has special mailto handling
      // Put web options before mailto due to permission issues
      return ['gmail', 'outlook', 'yahoo', 'mailto', 'copy'];
    }
    
    if (os === 'android' && this.isInIframe()) {
      // Android iframes have mailto issues
      // Prefer web options
      return ['gmail', 'outlook', 'yahoo', 'copy', 'mailto'];
    }
    
    return methods;
  }

  /**
   * Get platform-specific notification content
   */
  getPlatformNotification(): {
    title: string;
    message: string;
    icon: string;
    delay: number;
  } | null {
    const info = this.detect();
    
    if (info.os === 'ios') {
      return {
        title: "📱 iOS Email Permission",
        message: "Your device may ask permission to open your email app. Please tap 'Allow' when prompted.",
        icon: "📧",
        delay: 2000
      };
    }
    
    if (info.os === 'android') {
      if (info.isInIframe) {
        return {
          title: "⚠️ Email App Access",
          message: "Due to security restrictions, we'll open your email in a new tab instead.",
          icon: "🔗",
          delay: 1500
        };
      }
      return {
        title: "📧 Choose Your Email App",
        message: "You'll see an app selection dialog. Choose your preferred email app.",
        icon: "📬",
        delay: 1000
      };
    }
    
    if (!info.isMobile && !info.hasEmailClient) {
      return {
        title: "📮 Opening Email",
        message: "If no email app opens, we'll show you alternative options.",
        icon: "💌",
        delay: 1000
      };
    }
    
    return null;
  }

  /**
   * Get recommended email method based on environment
   */
  getRecommendedMethod(): EmailMethod {
    const info = this.detect();
    
    // Mobile devices - prefer native email app
    if (info.isMobile || info.isTablet) {
      if (info.os === 'ios' && info.browser === 'safari') {
        // iOS Safari has permission issues, prefer Gmail
        return 'gmail';
      }
      if (info.os === 'android' && info.isInIframe) {
        // Android iframes can't use mailto properly
        return 'gmail';
      }
      return 'mailto';
    }
    
    // Desktop - prefer web-based (many don't have email clients)
    return 'gmail';
  }
}

// Export singleton instance
export const environmentDetector = EnvironmentDetector.getInstance();