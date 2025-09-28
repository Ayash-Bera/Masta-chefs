"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  ArrowRight,
  Shield,
  Sparkles,
  Trophy,
  ArrowLeft
} from "lucide-react";
import { useAccount } from 'wagmi';

export default function VerifiedPage() {
  const router = useRouter();
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleContinue = () => {
    router.push("/dashboard");
  };

  const handleBackToOnboarding = () => {
    router.push("/onboarding");
  };

  if (!mounted) {
    return null;
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-gradient-to-b from-black via-green-950/20 to-black" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(34,197,94,0.1)_50%,transparent_100%)]" />
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4">
        {/* Success Animation Container */}
        <div className="w-full max-w-2xl mx-auto text-center">
          {/* Animated Success Icon */}
          <div className="relative mb-8">
            <div className="w-32 h-32 mx-auto relative">
              {/* Pulsing background circles */}
              <div className="absolute inset-0 bg-green-500/20 rounded-full animate-ping" />
              <div className="absolute inset-2 bg-green-500/30 rounded-full animate-pulse" />

              {/* Main success icon */}
              <div className="absolute inset-4 bg-green-500 rounded-full flex items-center justify-center">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>

              {/* Floating sparkles */}
              <div className="absolute -top-4 -right-4 text-yellow-400 animate-bounce">
                <Sparkles className="w-6 h-6" />
              </div>
              <div className="absolute -bottom-4 -left-4 text-yellow-400 animate-bounce" style={{ animationDelay: '0.5s' }}>
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="absolute top-0 left-0 text-yellow-400 animate-bounce" style={{ animationDelay: '1s' }}>
                <Sparkles className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Success Message */}
          <div className="mb-8">
            <h1 className="text-4xl md:text-5xl font-extralight mb-4 tracking-tight bg-gradient-to-b from-green-400 via-green-300 to-green-500 bg-clip-text text-transparent">
              Identity Verified!
            </h1>
            <p className="text-xl text-white/70 mb-6 leading-relaxed">
              🎉 Congratulations! You are now a verified human on Tsunami Wallet
            </p>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-xl p-6">
              <Shield className="w-8 h-8 text-green-400 mx-auto mb-3" />
              <h3 className="text-white font-medium mb-2">Enhanced Security</h3>
              <p className="text-white/60 text-sm">Access advanced security features</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-xl p-6">
              <Trophy className="w-8 h-8 text-yellow-400 mx-auto mb-3" />
              <h3 className="text-white font-medium mb-2">Verified Status</h3>
              <p className="text-white/60 text-sm">Prove your humanity on-chain</p>
            </div>

            <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-xl p-6">
              <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-3" />
              <h3 className="text-white font-medium mb-2">Exclusive Access</h3>
              <p className="text-white/60 text-sm">Unlock premium wallet features</p>
            </div>
          </div>

          {/* Verification Details */}
          {address && (
            <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-6 mb-8">
              <h3 className="text-green-200 font-medium mb-3">Verification Details</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-green-300/80">Wallet Address:</span>
                  <span className="text-green-200 font-mono">
                    {address.slice(0, 6)}...{address.slice(-4)}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-300/80">Verification Time:</span>
                  <span className="text-green-200">
                    {new Date().toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-300/80">Protocol:</span>
                  <span className="text-green-200">Self Protocol</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-green-300/80">Network:</span>
                  <span className="text-green-200">Celo Sepolia</span>
                </div>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleBackToOnboarding}
              className="flex items-center justify-center gap-2 px-6 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Verification
            </button>

            <button
              onClick={handleContinue}
              className="flex items-center justify-center gap-2 px-8 py-3 bg-[#e6ff55] text-[#0a0b0e] font-bold rounded-lg hover:brightness-110 transition-all"
            >
              <span>Continue to Dashboard</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center">
            <p className="text-white/50 text-sm">
              Your verification is stored securely on-chain using zero-knowledge proofs
            </p>
          </div>
        </div>
      </div>

      {/* CSS for custom animations */}
      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
      `}</style>
    </div>
  );
}