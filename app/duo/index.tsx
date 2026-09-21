import React from 'react';
import { useRouter } from 'expo-router';
import ClaudeDuoModal from '../../components/duo/ClaudeDuoModal';

export default function DuoScreen() {
  const router = useRouter();

  return (
    <ClaudeDuoModal
      visible={true}
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
