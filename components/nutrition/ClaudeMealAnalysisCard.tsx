import React from 'react';
import { StyleSheet, Text, View, Pressable, Platform } from 'react-native';

interface ClaudeMealAnalysisCardProps {
  onTakePhoto: () => void;
  onUploadPhoto: () => void;
}

const NAVY = '#0D2B45';
const GOLD = '#C9943A';
const COPPER = '#B5651D';
const OBSIDIAN = '#0D0D0D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: "'Clash Display', 'DM Sans', sans-serif", default: 'System' });
const DMSANS = Platform.select({ web: "'DM Sans', sans-serif", default: 'System' });
const INTER = Platform.select({ web: "'Inter', sans-serif", default: 'System' });

export default function ClaudeMealAnalysisCard({
  onTakePhoto,
  onUploadPhoto,
}: ClaudeMealAnalysisCardProps) {
  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <View style={styles.topRow}>
          {/* Camera Graphic Icon */}
          <View style={styles.cameraIconBox}>
            <View style={styles.cameraBody}>
              <View style={styles.cameraFlash} />
              <View style={styles.cameraLens} />
            </View>
          </View>

          <View style={styles.textCol}>
            <Text style={styles.kicker}>MEAL ANALYSIS</Text>
            <Text style={styles.title}>Photograph it instead of typing it</Text>
            <Text style={styles.sub}>
              Point your camera at the plate, or upload a photo. You get protein, carbs, fat and calories back — and one sentence on what to do about it.
            </Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsRow}>
          <Pressable style={styles.takePhotoBtn} onPress={onTakePhoto}>
            <Text style={styles.takePhotoBtnText}>Take a photo</Text>
          </Pressable>

          <Pressable style={styles.uploadBtn} onPress={onUploadPhoto}>
            <Text style={styles.uploadBtnText}>Upload</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  card: {
    backgroundColor: NAVY,
    borderRadius: 20,
    borderLeftWidth: 4,
    borderLeftColor: COPPER,
    padding: 20,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
  },
  cameraIconBox: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 148, 58, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraBody: {
    width: 22,
    height: 17,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: GOLD,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraFlash: {
    position: 'absolute',
    top: -5,
    left: 4,
    width: 8,
    height: 3,
    backgroundColor: GOLD,
    borderRadius: 2,
  },
  cameraLens: {
    width: 6,
    height: 6,
    borderRadius: 99,
    borderWidth: 2,
    borderColor: GOLD,
  },
  textCol: {
    flex: 1,
    minWidth: 0,
  },
  kicker: {
    fontFamily: DMSANS,
    fontSize: 10.5,
    fontWeight: '500',
    letterSpacing: 1.3,
    color: GOLD,
    marginBottom: 5,
  },
  title: {
    fontFamily: CLASH,
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '600',
    color: IVORY,
  },
  sub: {
    fontFamily: INTER,
    fontSize: 13,
    lineHeight: 20,
    color: 'rgba(247, 243, 238, 0.65)',
    marginTop: 7,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 9,
    marginTop: 16,
  },
  takePhotoBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
  },
  takePhotoBtnText: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '700',
    color: OBSIDIAN,
  },
  uploadBtn: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: 'rgba(201, 148, 58, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadBtnText: {
    fontFamily: DMSANS,
    fontSize: 14.5,
    fontWeight: '700',
    color: GOLD,
  },
});
