import React from 'react';
import { Platform, StyleSheet, Text, View, ViewStyle } from 'react-native';

type AuditStatus = 'extra' | 'uncertain' | 'mismatch';

type RequirementAuditBoundaryProps = {
  auditId: string;
  status: AuditStatus;
  label?: string;
  children: React.ReactNode;
  style?: ViewStyle;
};

function isAuditModeEnabled(): boolean {
  if (process.env.EXPO_PUBLIC_REQUIREMENT_AUDIT === 'true') {
    return true;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const searchParams = new URLSearchParams(window.location.search);
    if (searchParams.get('requirementAudit') === '1') {
      return true;
    }
    if (window.localStorage && window.localStorage.getItem('requirementAudit') === '1') {
      return true;
    }
  }

  return false;
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
  if (!isAuditModeEnabled()) {
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
