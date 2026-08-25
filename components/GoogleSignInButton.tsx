import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';
import { Colors } from '../constants/Colors';

interface GoogleSignInButtonProps {
  onPress: () => void;
  label?: string;
  disabled?: boolean;
}

export const GoogleSignInButton: React.FC<GoogleSignInButtonProps> = ({
  onPress,
  label = 'Continue with Google',
  disabled = false,
}) => {
  return (
    <TouchableOpacity
      style={styles.button}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={disabled}
    >
      <View style={styles.iconContainer}>
        <Text style={styles.googleG}>G</Text>
      </View>
      <Text style={styles.label}>{label}</Text>
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
  },
  iconContainer: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleG: {
    fontSize: 22,
    fontWeight: '700',
    color: '#4285F4',
  },
  label: {
    color: Colors.text,
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
});
