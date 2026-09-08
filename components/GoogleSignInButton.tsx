import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View, ActivityIndicator, Image } from 'react-native';
import { Colors } from '../constants/Colors';
import { Fonts } from '../constants/Typography';

const GOOGLE_LOGO = require('../assets/images/google_logo.png');

interface GoogleSignInButtonProps {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
  loading?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
  label = 'Continue with Google',
  disabled = false,
  loading = false,
}) => {
  return (
    <TouchableOpacity
      style={[styles.button, (disabled || loading) && styles.buttonDisabled]}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled || loading}
    >
      <View style={styles.iconContainer}>
        <Image
          source={GOOGLE_LOGO}
          style={styles.googleIcon}
          resizeMode="contain"
          accessibilityLabel="Google logo"
        />
      </View>
      <Text style={styles.label}>{label}</Text>
      {loading ? <ActivityIndicator size="small" color={Colors.text} style={styles.spinner} /> : null}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    width: '100%',
    height: 56,
    borderRadius: 16,
    backgroundColor: Colors.googleButton,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    paddingHorizontal: 18,
    position: 'relative',
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  iconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 1,
  },
  googleIcon: {
    width: 18,
    height: 18,
  },
  label: {
    color: Colors.text,
    fontSize: 15,
    fontFamily: Fonts.heading,
  },
  spinner: {
    marginLeft: 12,
  },
});
