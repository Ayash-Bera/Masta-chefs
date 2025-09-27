'use client';

import React from 'react';
import { CompliantProcedureStep } from '@/components/compliant-procedure-step';
import { useCompliantProcedure } from '@/lib/sdk/hooks/useCompliantProcedure';

export default function CompliantProcedurePage() {
  const { isCompliant, complianceData, stats } = useCompliantProcedure();

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Compliant Procedure Verification</h1>
          <p className="text-white/60">Complete your compliance verification using Self.xyz identity verification</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Compliance Verification Component */}
          <div className="col-span-1">
            <CompliantProcedureStep
              onComplianceComplete={(data) => {
                console.log('Compliance verification completed:', data);
                alert('Compliance verification completed successfully!');
              }}
              onComplianceError={(error) => {
                console.error('Compliance verification error:', error);
                alert('Compliance verification failed: ' + error);
              }}
              onSkip={() => {
                console.log('Compliance verification skipped');
                alert('Compliance verification skipped');
              }}
            />
          </div>

          {/* Status Information */}
          <div className="col-span-1">
            <div className="backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]" style={{ background: "rgba(255,255,255,0.06)" }}>
              <h3 className="text-lg font-semibold mb-4 text-white">Compliance Status</h3>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Status:</span>
                  <span className={`font-medium px-3 py-1 rounded-full text-sm ${isCompliant ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isCompliant ? 'Compliant' : 'Not Compliant'}
                  </span>
                </div>

                {complianceData && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-white/70">Nationality:</span>
                      <span className="text-white font-medium">{complianceData.nationality}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Document Type:</span>
                      <span className="text-white font-medium">
                        {complianceData.documentType === 1 ? 'E-Passport' : 'EU ID Card'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Verification Date:</span>
                      <span className="text-white font-medium">
                        {new Date(complianceData.timestamp * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Data Hash:</span>
                      <span className="text-white font-medium font-mono text-xs">
                        {complianceData.dataHash.slice(0, 10)}...{complianceData.dataHash.slice(-8)}
                      </span>
                    </div>
                  </>
                )}

                {stats && (
                  <div className="mt-6 pt-4 border-t border-white/15">
                    <h4 className="text-sm font-semibold text-white/60 mb-3">Network Statistics:</h4>
                    <div className="grid grid-cols-1 gap-4">
                      <div className="text-center p-3 rounded-xl bg-white/5">
                        <div className="text-2xl font-bold text-white">{stats.totalCompliantUsers}</div>
                        <div className="text-xs text-white/60">Total Compliant Users</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 backdrop-blur-3xl backdrop-saturate-200 border border-blue-500/20 rounded-2xl px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]" style={{ background: "rgba(59, 130, 246, 0.06)" }}>
          <h3 className="text-lg font-semibold text-blue-300 mb-3">How to Complete Compliance Verification</h3>
          <div className="space-y-2 text-sm text-blue-200">
            <p>1. Click "Start Compliance Verification" to begin the process</p>
            <p>2. Scan the QR code with your Self.xyz mobile app</p>
            <p>3. Use the mock passport feature for testing on Celo Sepolia</p>
            <p>4. Follow the identity verification flow in the Self.xyz app</p>
            <p>5. Your compliance status will be automatically updated upon successful verification</p>
            <p className="text-blue-300 font-medium">Note: This system uses Self.xyz Hub at 0x16EC...d74 for mock passport testing on Celo Sepolia testnet.</p>
          </div>
        </div>

        {/* Privacy Notice */}
        <div className="mt-6 backdrop-blur-3xl backdrop-saturate-200 border border-yellow-500/20 rounded-2xl px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]" style={{ background: "rgba(251, 191, 36, 0.06)" }}>
          <h3 className="text-lg font-semibold text-yellow-300 mb-3">Privacy Protection</h3>
          <div className="space-y-2 text-sm text-yellow-200">
            <p>• Your personal information (name, date of birth) is cryptographically hashed before storage</p>
            <p>• Only the hash, nationality, document type, and verification timestamp are stored on-chain</p>
            <p>• Your raw personal data never leaves the Self.xyz verification system</p>
            <p>• Compliance status can be verified without exposing personal information</p>
          </div>
        </div>
      </div>
    </div>
  );
}