"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  SelfQRcodeWrapper,
  SelfAppBuilder,
  type SelfApp,
  countries,
  getUniversalLink,
} from "@selfxyz/qrcode";
import { ethers } from "ethers";
import {
  Shield,
  Smartphone,
  CheckCircle,
  Copy,
  ArrowLeft,
  Info,
  Loader2,
  ExternalLink
} from "lucide-react";
import { useAccount } from 'wagmi';

export default function OnboardingPage() {
  const router = useRouter();
  const { address } = useAccount();
  const [linkCopied, setLinkCopied] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [selfApp, setSelfApp] = useState<SelfApp | null>(null);
  const [universalLink, setUniversalLink] = useState("");
  const [isInitializing, setIsInitializing] = useState(true);
  const [initError, setInitError] = useState<string | null>(null);

  // Use wallet address if connected, otherwise use zero address
  const userId = useMemo(() => address || ethers.ZeroAddress, [address]);

  // Use useMemo to cache the array to avoid creating a new array on each render
  const excludedCountries = useMemo(() => [countries.UNITED_STATES], []);

  // Use useEffect to ensure code only executes on the client side
  useEffect(() => {
    const initializeSelfApp = async () => {
      try {
        setIsInitializing(true);
        setInitError(null);

        const contractAddress = process.env.NEXT_PUBLIC_SELF_ENDPOINT;
        if (!contractAddress) {
          throw new Error("NEXT_PUBLIC_SELF_ENDPOINT not configured. Please deploy the contract and set the environment variable.");
        }

        const app = new SelfAppBuilder({
          version: 2,
          appName: process.env.NEXT_PUBLIC_SELF_APP_NAME || "Tsunami Wallet",
          scope: process.env.NEXT_PUBLIC_SELF_SCOPE || "tsunami-proof-of-human",
          endpoint: contractAddress,
          logoBase64: "https://i.postimg.cc/mrmVf9hm/self.png",
          userId: userId,
          endpointType: "staging_celo", // Use staging_celo for Celo Sepolia
          userIdType: "hex", // use 'hex' for ethereum address
          userDefinedData: "",
          disclosures: {
            // Verification requirements (must match contract config)
            minimumAge: 18,
            // excludedCountries: excludedCountries, // Uncomment to exclude USA
            // ofac: false, // OFAC compliance checking disabled

            // Disclosure requests (what users reveal) - all optional for basic proof of human
            // name: false,
            // nationality: true,
            // date_of_birth: false,
            // passport_number: false,
            // gender: false,
            // expiry_date: false,
          }
        }).build();

        setSelfApp(app);
        setUniversalLink(getUniversalLink(app));
        setIsInitializing(false);
      } catch (error) {
        console.error("Failed to initialize Self app:", error);
        setInitError(error instanceof Error ? error.message : 'Failed to initialize Self app');
        setIsInitializing(false);
      }
    };

    initializeSelfApp();
  }, [excludedCountries, userId]);

  const displayToast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const copyToClipboard = () => {
    if (!universalLink) return;

    navigator.clipboard
      .writeText(universalLink)
      .then(() => {
        setLinkCopied(true);
        displayToast("Universal link copied to clipboard!");
        setTimeout(() => setLinkCopied(false), 2000);
      })
      .catch((err) => {
        console.error("Failed to copy text: ", err);
        displayToast("Failed to copy link");
      });
  };

  const openSelfApp = () => {
    if (!universalLink) return;

    window.open(universalLink, "_blank");
    displayToast("Opening Self App...");
  };

  const handleSuccessfulVerification = () => {
    displayToast("Identity verification successful! Redirecting...");
    setTimeout(() => {
      router.push("/onboarding/verified");
    }, 1500);
  };

  const handleVerificationError = (error: any) => {
    console.error("Verification error:", error);
    displayToast("Verification failed. Please try again.");
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-white" />
          <p className="text-white/70">Initializing proof of human verification...</p>
        </div>
      </div>
    );
  }

  if (initError) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6">
            <h1 className="text-xl font-bold text-red-400 mb-4">Initialization Error</h1>
            <p className="text-red-300/80 mb-6">{initError}</p>
            <button
              onClick={() => router.push("/dashboard")}
              className="px-6 py-3 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white overflow-x-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-black via-purple-950/20 to-black" />

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        {/* Header */}
        <div className="w-full max-w-4xl mx-auto mb-8">
          <div className="flex items-center justify-between mb-6">
            <button
              onClick={() => router.push("/dashboard")}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 border border-white/20 rounded-lg text-white hover:bg-white/20 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 border border-white/15 rounded-md">
              <Shield className="w-4 h-4 text-white" />
              <span className="text-sm text-white">Proof of Human</span>
            </div>
          </div>

          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-extralight mb-4 tracking-tight bg-gradient-to-b from-white via-zinc-300 to-zinc-500 bg-clip-text text-transparent">
              Verify Your Humanity
            </h1>
            <p className="text-lg text-white/70 max-w-2xl mx-auto leading-relaxed">
              Complete identity verification with Self Protocol to unlock secure features on Tsunami Wallet
            </p>
          </div>
        </div>

        {/* Main content */}
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 items-center">
            {/* Left side - QR Code */}
            <div className="order-2 lg:order-1">
              <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-8 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]">
                <div className="text-center mb-6">
                  <h2 className="text-2xl font-light text-white mb-2">Scan QR Code</h2>
                  <p className="text-white/60">Use the Self Protocol mobile app to verify your identity</p>
                </div>

                <div className="flex justify-center mb-6">
                  {selfApp ? (
                    <div className="bg-white rounded-xl p-4">
                      <SelfQRcodeWrapper
                        selfApp={selfApp}
                        onSuccess={handleSuccessfulVerification}
                        onError={handleVerificationError}
                      />
                    </div>
                  ) : (
                    <div className="w-[256px] h-[256px] bg-white/10 animate-pulse flex items-center justify-center rounded-xl">
                      <p className="text-white/50 text-sm">Loading QR Code...</p>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3">
                  <button
                    type="button"
                    onClick={copyToClipboard}
                    disabled={!universalLink}
                    className="flex-1 flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 transition-colors text-white p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed border border-white/20"
                  >
                    <Copy className="w-4 h-4" />
                    {linkCopied ? "Copied!" : "Copy Link"}
                  </button>

                  <button
                    type="button"
                    onClick={openSelfApp}
                    disabled={!universalLink}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 transition-colors text-white p-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Smartphone className="w-4 h-4" />
                    Open Self App
                  </button>
                </div>

                {/* User address info */}
                <div className="mt-6 p-3 bg-white/5 rounded-lg border border-white/10">
                  <div className="text-center">
                    <span className="text-white/50 text-xs uppercase tracking-wide block mb-2">Wallet Address</span>
                    <div className="font-mono text-sm text-white break-all">
                      {userId ? userId : <span className="text-white/40">Not connected</span>}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right side - Information */}
            <div className="order-1 lg:order-2">
              <div className="space-y-6">
                <div className="bg-white/5 backdrop-blur-xl border border-white/15 rounded-2xl p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.10),0_16px_56px_rgba(0,0,0,0.35)]">
                  <h3 className="text-xl font-light text-white mb-4">How it works</h3>
                  <div className="space-y-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-blue-400 text-sm font-bold">1</span>
                      </div>
                      <div>
                        <h4 className="text-white font-medium">Download Self App</h4>
                        <p className="text-white/60 text-sm">Install the Self Protocol mobile app from the App Store or Google Play</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-purple-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-purple-400 text-sm font-bold">2</span>
                      </div>
                      <div>
                        <h4 className="text-white font-medium">Scan QR Code</h4>
                        <p className="text-white/60 text-sm">Use the app to scan the QR code shown on the left</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-green-400 text-sm font-bold">3</span>
                      </div>
                      <div>
                        <h4 className="text-white font-medium">Verify Identity</h4>
                        <p className="text-white/60 text-sm">Complete the identity verification process in the Self app</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-6">
                  <div className="flex items-center gap-3 mb-3">
                    <Info className="w-5 h-5 text-blue-400" />
                    <h3 className="text-lg font-medium text-blue-200">Privacy & Security</h3>
                  </div>
                  <ul className="space-y-2 text-blue-200/80 text-sm">
                    <li>• Zero-knowledge proofs protect your privacy</li>
                    <li>• No personal data is stored on-chain</li>
                    <li>• Self Protocol uses secure government-issued documents</li>
                    <li>• Your verification is cryptographically proven</li>
                  </ul>
                </div>

                <div className="text-center">
                  <a
                    href="https://self.xyz/download"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-white/60 hover:text-white transition-colors text-sm"
                  >
                    <span>Don't have the Self app?</span>
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Toast notification */}
        {showToast && (
          <div className="fixed bottom-4 right-4 bg-white/10 backdrop-blur-xl border border-white/20 text-white py-3 px-6 rounded-lg shadow-xl animate-fade-in text-sm">
            {toastMessage}
          </div>
        )}
      </div>
    </div>
  );
}