export interface MachineStats {
  id: string;
  name: string;
  icon: string;
  totalErrors: number;
  coverage: number;
  missingCauses: number;
}

export interface ErrorSummary {
  id: string;
  code: string;
  description: string;
  shortDescription: string;
  solutionsCount: number;
}

export interface TechnicalCause {
  id: string;
  rank: string;
  probability: 'High' | 'Medium' | 'Low';
  estTime: number;
  designation: string;
  indicators: string[];
  exclusionRules: string[];
  steps: string[];
}

export interface ErrorDetail {
  id: string;
  code: string;
  title: string;
  machineType: string;
  conditions: string[];
  occurrenceType: 'Sporadic' | 'Reproducible';
  connectedLogic: {
    code: string;
    description: string;
    type: 'error' | 'sensor';
  }[];
  causes: TechnicalCause[];
  safetyProtocols: {
    prohibited: string[];
    escalation: string[];
  };
  peerIntelligence: {
    author: string;
    role: string;
    date: string;
    content: string;
    initials: string;
  }[];
}
