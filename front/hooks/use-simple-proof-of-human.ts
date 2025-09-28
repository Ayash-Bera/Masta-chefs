import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { SIMPLE_PROOF_OF_HUMAN_CONTRACT } from '@/lib/contracts';

// Hook to read user verification status
export function useUserStatus(userAddress?: `0x${string}`) {
  return useReadContract({
    ...SIMPLE_PROOF_OF_HUMAN_CONTRACT,
    functionName: 'getUserStatus',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });
}

// Hook to read user profile data
export function useUserProfile(userAddress?: `0x${string}`) {
  return useReadContract({
    ...SIMPLE_PROOF_OF_HUMAN_CONTRACT,
    functionName: 'userProfiles',
    args: userAddress ? [userAddress] : undefined,
    query: {
      enabled: !!userAddress,
    },
  });
}

// Hook to read minimum age requirement
export function useMinimumAge() {
  return useReadContract({
    ...SIMPLE_PROOF_OF_HUMAN_CONTRACT,
    functionName: 'minimumAge',
  });
}

// Hook to read total verifications count
export function useTotalVerifications() {
  return useReadContract({
    ...SIMPLE_PROOF_OF_HUMAN_CONTRACT,
    functionName: 'totalVerifications',
  });
}

// Hook to calculate age from date string
export function useCalculateAge(dateOfBirth?: string) {
  return useReadContract({
    ...SIMPLE_PROOF_OF_HUMAN_CONTRACT,
    functionName: 'calculateAgeFromString',
    args: dateOfBirth ? [dateOfBirth] : undefined,
    query: {
      enabled: !!dateOfBirth,
    },
  });
}

// Hook to verify Self.xyz proof
export function useVerifySelfProof() {
  const {
    writeContract,
    data: hash,
    isPending,
    error,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } =
    useWaitForTransactionReceipt({
      hash,
    });

  const verifySelfProof = (proofPayload: `0x${string}`, userContextData: `0x${string}`) => {
    writeContract({
      ...SIMPLE_PROOF_OF_HUMAN_CONTRACT,
      functionName: 'verifySelfProof',
      args: [proofPayload, userContextData],
    });
  };

  return {
    verifySelfProof,
    hash,
    isPending,
    isConfirming,
    isConfirmed,
    error,
  };
}

// Combined hook for enhanced user verification info
export function useEnhancedUserVerification(userAddress?: `0x${string}`) {
  const { data: userStatus, isLoading: statusLoading } = useUserStatus(userAddress);
  const { data: userProfile, isLoading: profileLoading } = useUserProfile(userAddress);
  const { data: minimumAge } = useMinimumAge();

  const isLoading = statusLoading || profileLoading;

  if (!userStatus || !userProfile) {
    return {
      isLoading,
      isVerified: false,
      age: 0,
      nationality: '',
      dateOfBirth: '',
      verificationTimestamp: 0,
      nullifier: 0,
      meetsAgeRequirement: false,
    };
  }

  const [isVerified, age, nationality] = userStatus;
  const [, dateOfBirth, , nullifier, verificationTimestamp] = userProfile;

  return {
    isLoading,
    isVerified: Boolean(isVerified),
    age: Number(age),
    nationality: String(nationality),
    dateOfBirth: String(dateOfBirth),
    verificationTimestamp: Number(verificationTimestamp),
    nullifier: Number(nullifier),
    meetsAgeRequirement: minimumAge ? Number(age) >= Number(minimumAge) : false,
  };
}