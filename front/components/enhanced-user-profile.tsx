"use client";

import { useAccount } from 'wagmi';
import { useEnhancedUserVerification } from '@/hooks/use-simple-proof-of-human';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarDays, MapPin, Shield, Clock, CheckCircle, XCircle } from 'lucide-react';

export function EnhancedUserProfile() {
  const { address } = useAccount();
  const {
    isLoading,
    isVerified,
    age,
    nationality,
    dateOfBirth,
    verificationTimestamp,
    nullifier,
    meetsAgeRequirement,
  } = useEnhancedUserVerification(address);

  if (isLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Enhanced Verification Profile
          </CardTitle>
          <CardDescription>Loading verification status...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'Not available';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDateOfBirth = (dob: string) => {
    if (!dob) return 'Not available';
    try {
      return new Date(dob).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });
    } catch {
      return dob;
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          Enhanced Verification Profile
          {isVerified ? (
            <Badge variant="default" className="ml-auto bg-green-500">
              <CheckCircle className="h-3 w-3 mr-1" />
              Verified
            </Badge>
          ) : (
            <Badge variant="destructive" className="ml-auto">
              <XCircle className="h-3 w-3 mr-1" />
              Not Verified
            </Badge>
          )}
        </CardTitle>
        <CardDescription>
          Identity verification powered by Self.xyz with enhanced features
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {!isVerified ? (
          <div className="text-center py-8">
            <Shield className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Verification Found
            </h3>
            <p className="text-gray-500">
              Complete Self.xyz verification to see your enhanced profile data.
            </p>
          </div>
        ) : (
          <>
            {/* Personal Information */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wide">
                Personal Information
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <CalendarDays className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p className="font-medium">{formatDateOfBirth(dateOfBirth)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Nationality</p>
                    <p className="font-medium">{nationality || 'Not specified'}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Verification Details */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wide">
                Verification Details
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">Age</p>
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{age} years old</p>
                    {meetsAgeRequirement ? (
                      <Badge variant="default" className="text-xs bg-green-100 text-green-800">
                        Meets Requirements
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-xs">
                        Below Minimum
                      </Badge>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <div>
                    <p className="text-sm text-gray-500">Verified</p>
                    <p className="font-medium">{formatDate(verificationTimestamp)}</p>
                  </div>
                </div>
              </div>
            </div>

            <Separator />

            {/* Technical Details */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wide">
                Technical Details
              </h4>
              <div className="space-y-2">
                <div>
                  <p className="text-sm text-gray-500">Nullifier (Privacy Preserving ID)</p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono break-all">
                    {nullifier || 'Not available'}
                  </code>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Contract Address</p>
                  <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                    0x4b9F17d8deF00675C9aAf594f4e3611cFFDE6263
                  </code>
                </div>
              </div>
            </div>

            <Separator />

            {/* Features */}
            <div className="space-y-3">
              <h4 className="font-medium text-sm text-gray-700 uppercase tracking-wide">
                Enhanced Features
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Date of Birth Tracking</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Age Calculation</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Nationality Verification</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm">Privacy Preserving</span>
                </div>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}