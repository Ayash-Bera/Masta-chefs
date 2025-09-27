'use client';

import React, { useState } from 'react';
import { Shield, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { ComplianceQRCode } from './compliance-qr-code';
import { useAccount } from 'wagmi';

interface CompliantProcedureStepProps {
  onComplianceComplete?: (data: any) => void;
  onComplianceError?: (error: string) => void;
  onSkip?: () => void;
}

export function CompliantProcedureStep({
  onComplianceComplete,
  onComplianceError,
  onSkip
}: CompliantProcedureStepProps) {
  const { address, isConnected } = useAccount();
  const [currentStep, setCurrentStep] = useState<'initial' | 'qr' | 'verifying' | 'completed' | 'error'>('initial');
  const [error, setError] = useState<string>('');

  const handleStartCompliance = () => {
    if (!isConnected || !address) {
      setError('Please connect your wallet first');
      setCurrentStep('error');
      return;
    }
    setCurrentStep('qr');
  };

  const handleComplianceSuccess = () => {
    setCurrentStep('completed');
    onComplianceComplete?.({
      user: address,
      timestamp: Date.now(),
      verified: true
    });
  };

  const handleComplianceError = (errorMessage: string) => {
    setError(errorMessage);
    setCurrentStep('error');
    onComplianceError?.(errorMessage);
  };

  const handleRetry = () => {
    setError('');
    setCurrentStep('initial');
  };

  const renderInitialStep = () => (
    <div className="backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-blue-500/20 rounded-full flex items-center justify-center">
            <Shield className="w-10 h-10 text-blue-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Compliance Verification Required</h2>
          <p className="text-white/70 max-w-md mx-auto">
            Verify your identity using Self.xyz to complete your compliance procedure and access all platform features.
          </p>
        </div>

        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 text-sm text-white/60">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span>Privacy-preserving identity verification</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span>Data is hashed and stored securely</span>
            </div>
            <div className="flex items-center gap-3">
              <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />
              <span>Compliant with regulatory requirements</span>
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-4">
            <button
              onClick={handleStartCompliance}
              disabled={!isConnected}
              className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
            >
              {isConnected ? 'Start Compliance Verification' : 'Connect Wallet First'}
            </button>

            <button
              onClick={onSkip}
              className="w-full px-6 py-3 text-white/70 hover:text-white transition-colors text-sm"
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderQRStep = () => (
    <div className="backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Scan QR Code</h2>
          <p className="text-white/70">
            Use your Self.xyz mobile app to scan the QR code below and complete identity verification.
          </p>
        </div>

        <ComplianceQRCode
          userId={address}
          onSuccess={handleComplianceSuccess}
          onError={handleComplianceError}
          className="mx-auto"
        />

        <div className="flex justify-center">
          <button
            onClick={() => setCurrentStep('initial')}
            className="px-4 py-2 text-white/70 hover:text-white transition-colors text-sm"
          >
            ← Back
          </button>
        </div>
      </div>
    </div>
  );

  const renderVerifyingStep = () => (
    <div className="backdrop-blur-3xl backdrop-saturate-200 border border-white/15 rounded-2xl px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]" style={{ background: "rgba(255,255,255,0.06)" }}>
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-white">Verifying Compliance</h2>
          <p className="text-white/70">
            Please wait while we process your compliance verification...
          </p>
        </div>
      </div>
    </div>
  );

  const renderCompletedStep = () => (
    <div className="backdrop-blur-3xl backdrop-saturate-200 border border-green-500/20 rounded-2xl px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]" style={{ background: "rgba(34, 197, 94, 0.06)" }}>
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-green-500/20 rounded-full flex items-center justify-center">
            <CheckCircle className="w-10 h-10 text-green-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-green-400">Compliance Verified!</h2>
          <p className="text-white/70">
            Your identity has been successfully verified and your compliance status has been updated.
          </p>
        </div>

        <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="text-sm text-green-300 space-y-1">
            <div className="flex justify-between">
              <span>Status:</span>
              <span className="font-medium">Compliant</span>
            </div>
            <div className="flex justify-between">
              <span>Verified:</span>
              <span className="font-medium">{new Date().toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
              <span>Address:</span>
              <span className="font-mono text-xs">{address?.slice(0, 8)}...{address?.slice(-8)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderErrorStep = () => (
    <div className="backdrop-blur-3xl backdrop-saturate-200 border border-red-500/20 rounded-2xl px-6 py-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]" style={{ background: "rgba(239, 68, 68, 0.06)" }}>
      <div className="text-center space-y-6">
        <div className="flex justify-center">
          <div className="w-20 h-20 bg-red-500/20 rounded-full flex items-center justify-center">
            <AlertCircle className="w-10 h-10 text-red-400" />
          </div>
        </div>

        <div className="space-y-2">
          <h2 className="text-2xl font-bold text-red-400">Verification Failed</h2>
          <p className="text-white/70">
            There was an issue with your compliance verification.
          </p>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        <div className="flex gap-3 justify-center">
          <button
            onClick={handleRetry}
            className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-medium"
          >
            Try Again
          </button>
          <button
            onClick={onSkip}
            className="px-6 py-3 text-white/70 hover:text-white transition-colors"
          >
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );

  switch (currentStep) {
    case 'initial':
      return renderInitialStep();
    case 'qr':
      return renderQRStep();
    case 'verifying':
      return renderVerifyingStep();
    case 'completed':
      return renderCompletedStep();
    case 'error':
      return renderErrorStep();
    default:
      return renderInitialStep();
  }
}