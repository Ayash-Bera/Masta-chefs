// SPDX-License-Identifier: MIT
'use client';

import React from 'react';
import { KYCStep } from '@/components/kyc-step';
import { useSelfKYC } from '@/lib/sdk';

export default function KYCTestPage() {
  const { isVerified, kycData, stats } = useSelfKYC();

  return (
    <div className="min-h-screen bg-black text-white p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">KYC Test Page</h1>
          <p className="text-white/60">Test the KYC verification functionality</p>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* KYC Verification Component */}
          <div className="col-span-1">
            <KYCStep
              onKYCComplete={(data) => {
                console.log('KYC verification completed:', data);
                alert('KYC verification completed successfully!');
              }}
              onKYCError={(error) => {
                console.error('KYC verification error:', error);
                alert('KYC verification failed: ' + error);
              }}
              onSkip={() => {
                console.log('KYC verification skipped');
                alert('KYC verification skipped');
              }}
            />
          </div>

          {/* Status Information */}
          <div className="col-span-1">
            <div className="backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-6 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]" style={{ background: "rgba(255,255,255,0.06)" }}>
              <h3 className="text-lg font-semibold mb-4 text-white">Status Information</h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-white/70">Verified:</span>
                  <span className={`font-medium px-3 py-1 rounded-full text-sm ${isVerified ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                    {isVerified ? 'Yes' : 'No'}
                  </span>
                </div>

                {kycData && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-white/70">Nationality:</span>
                      <span className="text-white font-medium">{kycData.nationality}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Document Type:</span>
                      <span className="text-white font-medium">
                        {kycData.documentType === 1 ? 'E-Passport' : 'EU ID Card'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">OFAC Clear:</span>
                      <span className={`font-medium ${kycData.isOfacClear ? 'text-green-400' : 'text-red-400'}`}>
                        {kycData.isOfacClear ? 'Yes' : 'No'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white/70">Verifications:</span>
                      <span className="text-white font-medium">{kycData.verificationCount}</span>
                    </div>
                  </>
                )}

                {stats && (
                  <div className="mt-6 pt-4 border-t border-white/15">
                    <h4 className="text-sm font-semibold text-white/60 mb-3">Statistics:</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 rounded-xl bg-white/5">
                        <div className="text-2xl font-bold text-white">{stats.totalVerifications}</div>
                        <div className="text-xs text-white/60">Total Verifications</div>
                      </div>
                      <div className="text-center p-3 rounded-xl bg-white/5">
                        <div className="text-2xl font-bold text-white">{stats.uniqueUsers}</div>
                        <div className="text-xs text-white/60">Unique Users</div>
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
          <h3 className="text-lg font-semibold text-blue-300 mb-3">How to Test KYC</h3>
          <div className="space-y-2 text-sm text-blue-200">
            <p>1. Click "Start KYC Verification" to begin the process</p>
            <p>2. Click "Generate Self.xyz Proof" to create a mock proof</p>
            <p>3. Click "Verify KYC" to complete the verification</p>
            <p>4. Check the status information on the right to see the results</p>
            <p className="text-blue-300 font-medium">Note: This is a demo with mock data. In production, this would integrate with the actual Self.xyz mobile app.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
