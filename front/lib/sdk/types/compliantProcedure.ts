// Types for CompliantProcedure contract integration

export interface UserCompliance {
  dataHash: string;          // bytes32 hash of user data
  timestamp: number;         // Verification timestamp (Unix timestamp)
  isCompliant: boolean;      // Compliance status
  nationality: string;       // User nationality
  documentType: number;      // Document type (1=Passport, 2=ID Card, etc.)
}

export interface ComplianceResult {
  success: boolean;
  message?: string;
  error?: string;
  transactionHash?: string;
}

export interface ComplianceStats {
  totalCompliantUsers: number;
}

export interface ComplianceVerificationData {
  user: string;              // User address
  name: string;              // User's full name
  dateOfBirth: string;       // Date of birth (YYYY-MM-DD format)
  nationality: string;       // User nationality
  documentType: number;      // Document type
}

export interface ComplianceEvent {
  user: string;              // User address (indexed)
  dataHash: string;          // Data hash (indexed)
  nationality: string;       // User nationality
  documentType: number;      // Document type
  timestamp: number;         // Block timestamp
  transactionHash: string;   // Transaction hash
  blockNumber: number;       // Block number
}

export interface ComplianceSessionData {
  scope: string;
  configId: string;
  endpoint: string;
  userId: string;
  requirements: {
    minimumAge?: number;
    requireOfacCheck?: boolean;
    excludedCountries?: string[];
    allowedDocumentTypes?: number[];
  };
}