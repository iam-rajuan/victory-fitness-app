import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Platform, Share } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/Colors';
import { Fonts } from '../../constants/Typography';
import { useLanguage } from '../../lib/i18n';

export default function InviteFriendsCard() {
  const { t } = useLanguage();
  const [sharing, setSharing] = useState(false);

  const inviteUrl =
    Platform.OS === 'web' && typeof window !== 'undefined'
      ? window.location.origin
      : 'https://victory-fitness-app.vercel.app';

  const inviteMessage = `${t('Join me on Victory Fitness and start training with me.')}\n${inviteUrl}`;

  const handleInviteFriends = async () => {
    if (sharing) {
      return;
    }

    setSharing(true);
    try {
      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({
          title: 'Victory Fitness',
          text: t('Join me on Victory Fitness and start training with me.'),
          url: inviteUrl,
        });
        return;
      }

      if (Platform.OS === 'web' && typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(inviteUrl);
        Alert.alert(t('Invite link copied'), t('The Victory Fitness invite link was copied to your clipboard.'));
        return;
      }

      await Share.share({
        message: inviteMessage,
        url: inviteUrl,
      });
    } catch (error) {
      Alert.alert(t('Invite failed'), error instanceof Error ? error.message : t('Unable to share the invite link right now.'));
    } finally {
      setSharing(false);
    }
  };

  return (
    <View style={styles.premiumInviteCard}>
      <View style={styles.inviteTopRow}>
        <View style={styles.inviteFriendsIcon}>
          <Ionicons name="people" size={24} color={Colors.gold} />
        </View>
        <View style={styles.goldBadge}>
          <Text style={styles.goldBadgeText}>+100 {t('Points')}</Text>
        </View>
      </View>

      <Text style={styles.premiumInviteTitle}>{t("Don't train alone!")}</Text>
      <Text style={styles.premiumInviteDesc}>
        {t('Bring your friends to Victory Fitness. Motivate each other and earn points for the next rank.')}
      </Text>

      <TouchableOpacity style={styles.premiumInviteBtn} activeOpacity={0.85} onPress={() => void handleInviteFriends()}>
        <Text style={styles.premiumInviteBtnText}>{sharing ? t('Sharing...') : t('Invite Friends')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  premiumInviteCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: 20,
    padding: 20,
    marginBottom: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(181, 101, 29, 0.25)',
    shadowColor: Colors.navy,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 2,
  },
  inviteTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  inviteFriendsIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(201, 148, 58, 0.16)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  goldBadge: {
    backgroundColor: 'rgba(201, 148, 58, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(201, 148, 58, 0.35)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  goldBadgeText: {
    color: Colors.gold,
    fontSize: 12,
    fontFamily: Fonts.dataBold,
  },
  premiumInviteTitle: {
    fontSize: 19,
    color: Colors.ivory,
    marginBottom: 10,
    fontFamily: Fonts.display,
  },
  premiumInviteDesc: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: 20,
    fontFamily: Fonts.body,
  },
  premiumInviteBtn: {
    backgroundColor: Colors.gold,
    borderRadius: 14,
    paddingVertical: 14,
    width: '100%',
    alignItems: 'center',
  },
  premiumInviteBtnText: {
    color: Colors.obsidian,
    fontSize: 13,
    fontFamily: Fonts.heading,
  },
});
