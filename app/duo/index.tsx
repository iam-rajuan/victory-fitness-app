import React from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import ClaudeDuoModal from '../../components/duo/ClaudeDuoModal';

export default function DuoScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ invite_code?: string; code?: string }>();
  const inviteCode = String(params.invite_code || params.code || '').trim();

  return (
    <ClaudeDuoModal
      visible={true}
      initialInviteCode={inviteCode}
      onClose={() => {
        if (router.canGoBack()) {
          router.back();
        } else {
          router.replace('/(tabs)');
        }
      }}
    />
  );
}
