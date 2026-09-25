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

function isAuditModeEnabled() {
  const envEnabled = process.env.EXPO_PUBLIC_REQUIREMENT_AUDIT === 'true';
  if (envEnabled) {
    return true;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return new URLSearchParams(window.location.search).get('requirementAudit') === '1';
  }

  return false;
}

function getLabel(status: AuditStatus, label?: string) {
  if (label) {
    return label;
  }
  if (status === 'uncertain') {
    return 'REVIEW - REQUIREMENT UNCLEAR';
  }
  if (status === 'mismatch') {
    return 'MISMATCH - CHECK REQUIREMENT';
  }
  return 'NEW FEATURE - NOT IN REQUIREMENT';
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
      <View style={[styles.label, isUncertain && styles.uncertainLabel, isMismatch && styles.mismatchLabel]}>
        <Text style={styles.labelText}>{`${auditId} - ${getLabel(status, label)}`}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  boundary: {
    borderWidth: 2,
    borderColor: '#E53935',
    borderStyle: 'solid',
    borderRadius: 10,
    padding: 4,
    position: 'relative',
  },
  uncertain: {
    borderStyle: 'dashed',
  },
  mismatch: {
    borderColor: '#F59E0B',
  },
  label: {
    alignSelf: 'flex-start',
    backgroundColor: '#E53935',
    borderRadius: 5,
    marginBottom: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  uncertainLabel: {
    backgroundColor: '#B42318',
  },
  mismatchLabel: {
    backgroundColor: '#F59E0B',
  },
  labelText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 0.3,
  },
});
