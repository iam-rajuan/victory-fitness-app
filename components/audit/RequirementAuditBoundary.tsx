import React, { useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, View, ViewStyle } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest } from '../../lib/api';

type AuditStatus = 'extra' | 'uncertain' | 'mismatch';

type RequirementAuditBoundaryProps = {
  auditId: string;
  status: AuditStatus;
  label?: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

const APP_AUDIT_FLAG_KEY = 'requirement_audit_app_marks';
const APP_AUDIT_STORAGE_KEY = 'victoryRequirementAuditAppMarks';
let cachedAuditMode: boolean | null = null;
let auditModePromise: Promise<boolean> | null = null;

function parseStoredAuditMode(value: string | null | undefined): boolean | null {
  if (value === '1' || value === 'true') return true;
  if (value === '0' || value === 'false') return false;
  return null;
}

async function readStoredAuditMode(): Promise<boolean | null> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      return parseStoredAuditMode(window.localStorage?.getItem(APP_AUDIT_STORAGE_KEY));
    } catch {
      return null;
    }
  }

  try {
    return parseStoredAuditMode(await AsyncStorage.getItem(APP_AUDIT_STORAGE_KEY));
  } catch {
    return null;
  }
}

async function writeStoredAuditMode(enabled: boolean): Promise<void> {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    try {
      window.localStorage?.setItem(APP_AUDIT_STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      // Storage is only a cache; backend remains the source of truth.
    }
    return;
  }

  try {
    await AsyncStorage.setItem(APP_AUDIT_STORAGE_KEY, enabled ? '1' : '0');
  } catch {
    // Storage is only a cache; backend remains the source of truth.
  }
}

async function loadAuditMode(): Promise<boolean> {
  if (cachedAuditMode !== null) {
    return cachedAuditMode;
  }

  const stored = await readStoredAuditMode();
  if (stored !== null) {
    cachedAuditMode = stored;
  }

  try {
    const response = await apiRequest<{ items: { key: string; enabled: boolean }[] }>('/me/feature-flags', {
      skipResponseCache: true,
    });
    const item = response.items.find((flag) => flag.key === APP_AUDIT_FLAG_KEY);
    const enabled = Boolean(item?.enabled);
    cachedAuditMode = enabled;
    await writeStoredAuditMode(enabled);
    return enabled;
  } catch {
    cachedAuditMode = stored ?? false;
    return cachedAuditMode;
  }
}

function useAuditModeEnabled(): boolean {
  const [enabled, setEnabled] = useState(() => cachedAuditMode ?? false);

  useEffect(() => {
    let mounted = true;
    if (!auditModePromise) {
      auditModePromise = loadAuditMode().finally(() => {
        auditModePromise = null;
      });
    }
    auditModePromise.then((nextEnabled) => {
      if (mounted) {
        setEnabled(nextEnabled);
      }
    });
    return () => {
      mounted = false;
    };
  }, []);

  return enabled;
}

function getLabel(status: AuditStatus, label?: string): string {
  if (label) {
    return label;
  }
  if (status === 'uncertain') {
    return 'REVIEW — REQUIREMENT UNCLEAR';
  }
  if (status === 'mismatch') {
    return 'MISMATCH — DOES NOT MATCH REQUIREMENT';
  }
  return 'NEW FEATURE — NOT IN REQUIREMENT';
}

export default function RequirementAuditBoundary({
  auditId,
  status,
  label,
  children,
  style,
}: RequirementAuditBoundaryProps) {
  const auditModeEnabled = useAuditModeEnabled();

  if (!auditModeEnabled) {
    return <>{children}</>;
  }

  const isUncertain = status === 'uncertain';
  const isMismatch = status === 'mismatch';

  return (
    <View
      style={[
        styles.boundary,
        isUncertain && styles.uncertain,
        isMismatch && styles.mismatch,
        style,
      ]}
    >
      <View
        style={[
          styles.label,
          isUncertain && styles.uncertainLabel,
          isMismatch && styles.mismatchLabel,
        ]}
      >
        <Text style={styles.labelText}>{`${auditId} · ${getLabel(status, label)}`}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  boundary: {
    borderWidth: 3,
    borderColor: '#E53935',
    borderStyle: 'solid',
    borderRadius: 10,
    padding: 4,
    position: 'relative',
    marginVertical: 4,
  },
  uncertain: {
    borderWidth: 3,
    borderColor: '#E53935',
    borderStyle: 'dashed',
  },
  mismatch: {
    borderWidth: 3,
    borderColor: '#F59E0B',
    borderStyle: 'solid',
  },
  label: {
    alignSelf: 'flex-start',
    backgroundColor: '#E53935',
    borderRadius: 4,
    marginBottom: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 999,
  },
  uncertainLabel: {
    backgroundColor: '#B42318',
  },
  mismatchLabel: {
    backgroundColor: '#D97706',
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.4,
    fontFamily: Platform.select({ web: "'DM Sans', sans-serif", default: 'System' }),
  },
});
