import type { Contact } from "@shared/schema";
import type { EnhancedContactFinderOptions } from "./finder";

export interface SearchPhaseMetrics {
  phaseName: string;
  enabled: boolean;
  executed: boolean;
  contactsFound: number;
  highQualityContacts: number;
  executionTime: number;
  skippedReason?: string;
}

export interface FallbackMetrics {
  triggered: boolean;
  reason: string;
  fallbacksExecuted: string[];
  contactsAdded: number;
  totalExecutionTime: number;
}

export interface SearchSessionMetrics {
  companyName: string;
  startTime: number;
  endTime: number;
  totalDuration: number;
  originalConfig: EnhancedContactFinderOptions;
  searchPhases: SearchPhaseMetrics[];
  fallbackMetrics?: FallbackMetrics;
  finalContactCount: number;
  finalHighQualityCount: number;
  apiCallsTotal: number;
  rateLimitingDelay: number;
}

export class SearchPerformanceLogger {
  private static sessions: Map<string, SearchSessionMetrics> = new Map();

  static startSession(companyName: string, config: EnhancedContactFinderOptions): string {
    const sessionId = `${companyName}_${Date.now()}`;
    const session: SearchSessionMetrics = {
      companyName,
      startTime: Date.now(),
      endTime: 0,
      totalDuration: 0,
      originalConfig: { ...config },
      searchPhases: [],
      finalContactCount: 0,
      finalHighQualityCount: 0,
      apiCallsTotal: 0,
      rateLimitingDelay: 0
    };
    
    this.sessions.set(sessionId, session);
    console.log(`Search session started for ${companyName} [${sessionId}]`);
    return sessionId;
  }

  static logSearchPhase(
    sessionId: string, 
    phaseName: string, 
    enabled: boolean, 
    executed: boolean,
    contacts: Partial<Contact>[] = [],
    executionTime: number = 0,
    skippedReason?: string
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const highQualityContacts = contacts.filter(c => (c.probability || 0) >= 70).length;
    
    const phaseMetrics: SearchPhaseMetrics = {
      phaseName,
      enabled,
      executed,
      contactsFound: contacts.length,
      highQualityContacts,
      executionTime,
      skippedReason
    };

    session.searchPhases.push(phaseMetrics);
    session.apiCallsTotal += executed ? 1 : 0;
    session.rateLimitingDelay += executed ? 200 : 0;

    const status = executed ? 
      `✓ ${contacts.length} contacts (${highQualityContacts} high-quality)` :
      `⏭ ${skippedReason || 'disabled'}`;
    
    console.log(`[${sessionId}] ${phaseName}: ${status}`);
  }

  static logFallback(
    sessionId: string,
    triggered: boolean,
    reason: string,
    fallbacksExecuted: string[] = [],
    contactsAdded: number = 0,
    executionTime: number = 0
  ) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    session.fallbackMetrics = {
      triggered,
      reason,
      fallbacksExecuted,
      contactsAdded,
      totalExecutionTime: executionTime
    };

    session.apiCallsTotal += fallbacksExecuted.length;
    session.rateLimitingDelay += fallbacksExecuted.length * 200;

    if (triggered) {
      console.log(`[${sessionId}] Smart fallback: ${reason}`);
      console.log(`[${sessionId}] Executed fallbacks: ${fallbacksExecuted.join(', ')}`);
      console.log(`[${sessionId}] Added ${contactsAdded} contacts`);
    }
  }

  static endSession(sessionId: string, finalContacts: Partial<Contact>[]): SearchSessionMetrics | null {
    const session = this.sessions.get(sessionId);
    if (!session) return null;

    session.endTime = Date.now();
    session.totalDuration = session.endTime - session.startTime;
    session.finalContactCount = finalContacts.length;
    session.finalHighQualityCount = finalContacts.filter(c => (c.probability || 0) >= 70).length;

    // Generate comprehensive summary
    console.log(`\n=== Search Session Complete [${sessionId}] ===`);
    console.log(`Company: ${session.companyName}`);
    console.log(`Duration: ${session.totalDuration}ms`);
    console.log(`API Calls: ${session.apiCallsTotal}`);
    console.log(`Rate Limiting Delay: ${session.rateLimitingDelay}ms`);
    console.log(`Final Results: ${session.finalContactCount} contacts (${session.finalHighQualityCount} high-quality)`);
    
    console.log(`\nSearch Phases:`);
    session.searchPhases.forEach(phase => {
      const icon = phase.executed ? '✓' : '⏭';
      const details = phase.executed ? 
        `${phase.contactsFound} contacts (${phase.highQualityContacts} HQ)` :
        phase.skippedReason || 'disabled';
      console.log(`  ${icon} ${phase.phaseName}: ${details}`);
    });

    if (session.fallbackMetrics?.triggered) {
      console.log(`\nSmart Fallback:`);
      console.log(`  Reason: ${session.fallbackMetrics.reason}`);
      console.log(`  Executed: ${session.fallbackMetrics.fallbacksExecuted.join(', ')}`);
      console.log(`  Added: ${session.fallbackMetrics.contactsAdded} contacts`);
    }

    console.log(`=====================================\n`);

    // Clean up session
    this.sessions.delete(sessionId);
    return session;
  }

  static getSessionMetrics(sessionId: string): SearchSessionMetrics | null {
    return this.sessions.get(sessionId) || null;
  }

  // Analysis methods
  static analyzeEfficiency(session: SearchSessionMetrics): {
    efficiency: number;
    recommendations: string[];
  } {
    const recommendations: string[] = [];
    
    // Calculate efficiency based on contacts per API call
    const contactsPerCall = session.apiCallsTotal > 0 ? 
      session.finalContactCount / session.apiCallsTotal : 0;
    
    const efficiency = Math.min(contactsPerCall * 10, 100); // Scale to 0-100

    // Analyze search phase efficiency
    const executedPhases = session.searchPhases.filter(p => p.executed);
    const unproductivePhases = executedPhases.filter(p => p.contactsFound === 0);
    
    if (unproductivePhases.length > 0) {
      recommendations.push(`Consider disabling: ${unproductivePhases.map(p => p.phaseName).join(', ')}`);
    }

    // Analyze fallback effectiveness
    if (session.fallbackMetrics?.triggered && session.fallbackMetrics.contactsAdded === 0) {
      recommendations.push('Fallback searches were unproductive - consider adjusting thresholds');
    }

    // Analyze total API usage
    if (session.apiCallsTotal >= 4 && session.finalContactCount < 5) {
      recommendations.push('High API usage with low results - optimize search configuration');
    }

    return { efficiency, recommendations };
  }
}