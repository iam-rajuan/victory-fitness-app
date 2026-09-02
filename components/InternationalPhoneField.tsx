import React from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../constants/Colors';
import {
  buildE164PhoneNumber,
  COUNTRY_DIAL_CODES,
  findCountryByDialCode,
  normalizePhoneDigits,
  splitE164PhoneNumber,
  type CountryDialCode,
} from '../lib/phone';

type InternationalPhoneFieldProps = {
  label?: string;
  value: string;
  onChangeText: (value: string) => void;
  placeholder?: string;
  error?: string;
  helperText?: string;
  disabled?: boolean;
  theme?: 'dark' | 'light';
  defaultCountryCode?: string;
  containerStyle?: StyleProp<ViewStyle>;
};

export function InternationalPhoneField({
  label,
  value,
  onChangeText,
  placeholder = 'Enter phone number',
  error,
  helperText,
  disabled = false,
  theme = 'dark',
  defaultCountryCode = '+233',
  containerStyle,
}: InternationalPhoneFieldProps) {
  const [pickerVisible, setPickerVisible] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const ghanaCountry = React.useMemo(
    () => COUNTRY_DIAL_CODES.find((item) => item.code === 'GH' && item.dialCode === '+233') || COUNTRY_DIAL_CODES[0],
    []
  );
  const initialCountry = React.useMemo(
    () => findCountryByDialCode(defaultCountryCode) || ghanaCountry,
    [defaultCountryCode, ghanaCountry]
  );
  const [selectedCountry, setSelectedCountry] = React.useState<CountryDialCode>(initialCountry);
  const [nationalNumber, setNationalNumber] = React.useState('');

  React.useEffect(() => {
    const parsed = splitE164PhoneNumber(value);
    if (parsed) {
      setSelectedCountry(parsed.country);
      setNationalNumber(parsed.nationalNumber);
      return;
    }

    if (!value) {
      setSelectedCountry(initialCountry);
      setNationalNumber('');
      return;
    }

    setNationalNumber(normalizePhoneDigits(value));
  }, [initialCountry, value]);

  const palette = theme === 'light' ? lightTheme : darkTheme;
  const filteredCountries = React.useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return [ghanaCountry, ...COUNTRY_DIAL_CODES.filter((item) => item !== ghanaCountry)];
    }
    const matches = COUNTRY_DIAL_CODES.filter((item) =>
      item.name.toLowerCase().includes(normalizedQuery) ||
      item.code.toLowerCase().includes(normalizedQuery) ||
      item.dialCode.toLowerCase().includes(normalizedQuery)
    );
    return matches.some((item) => item === ghanaCountry)
      ? [ghanaCountry, ...matches.filter((item) => item !== ghanaCountry)]
      : matches;
  }, [searchQuery]);

  const updatePhoneValue = React.useCallback((country: CountryDialCode, number: string) => {
    const e164Value = buildE164PhoneNumber(country.dialCode, number);
    onChangeText(e164Value);
  }, [onChangeText]);

  const handleCountrySelect = (country: CountryDialCode) => {
    setSelectedCountry(country);
    setPickerVisible(false);
    updatePhoneValue(country, nationalNumber);
  };

  const handleNationalNumberChange = (text: string) => {
    const normalized = normalizePhoneDigits(text);
    setNationalNumber(normalized);
    updatePhoneValue(selectedCountry, normalized);
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label ? <Text style={[styles.label, palette.label]}>{label}</Text> : null}

      <View style={[styles.inputRow, palette.inputRow, error ? styles.inputRowError : null]}>
        <TouchableOpacity
          style={[styles.countryButton, palette.countryButton]}
          activeOpacity={0.8}
          onPress={() => !disabled && setPickerVisible(true)}
          disabled={disabled}
        >
          <View style={[styles.countryBadge, palette.countryBadge]}>
            <Text style={[styles.countryBadgeText, palette.countryBadgeText]}>{selectedCountry.code}</Text>
          </View>
          <Text style={[styles.countryDialCode, palette.countryDialCode]}>{selectedCountry.dialCode}</Text>
          <Ionicons name="chevron-down" size={16} color={theme === 'light' ? '#4B5563' : Colors.textSecondary} />
        </TouchableOpacity>

        <TextInput
          style={[styles.numberInput, palette.numberInput]}
          placeholder={placeholder}
          placeholderTextColor={theme === 'light' ? '#9CA3AF' : Colors.placeholder}
          keyboardType="phone-pad"
          value={nationalNumber}
          onChangeText={handleNationalNumberChange}
          editable={!disabled}
        />
      </View>

      {helperText && !error ? <Text style={[styles.helperText, palette.helperText]}>{helperText}</Text> : null}
      {error ? (
        <View style={styles.errorRow}>
          <Ionicons name="alert-circle-outline" size={14} color="#EF4444" style={styles.errorIcon} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <Modal visible={pickerVisible} transparent animationType="fade" onRequestClose={() => setPickerVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setPickerVisible(false)}>
          <Pressable style={[styles.modalCard, palette.modalCard]} onPress={(event) => event.stopPropagation()}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, palette.modalTitle]}>Select country code</Text>
              <TouchableOpacity activeOpacity={0.8} onPress={() => setPickerVisible(false)}>
                <Ionicons name="close" size={20} color={theme === 'light' ? '#111827' : '#FFFFFF'} />
              </TouchableOpacity>
            </View>

            <View style={[styles.searchWrap, palette.searchWrap]}>
              <Ionicons name="search-outline" size={18} color={theme === 'light' ? '#6B7280' : Colors.textMuted} />
              <TextInput
                style={[styles.searchInput, palette.searchInput]}
                placeholder="Search country or code"
                placeholderTextColor={theme === 'light' ? '#9CA3AF' : Colors.placeholder}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCapitalize="none"
              />
            </View>

            <ScrollView style={styles.countryList} keyboardShouldPersistTaps="handled">
              {filteredCountries.map((country) => {
                const isSelected = country.code === selectedCountry.code && country.dialCode === selectedCountry.dialCode;
                return (
                  <TouchableOpacity
                    key={`${country.code}-${country.dialCode}`}
                    style={[styles.countryItem, palette.countryItem, isSelected ? palette.countryItemSelected : null]}
                    activeOpacity={0.82}
                    onPress={() => handleCountrySelect(country)}
                  >
                    <View style={styles.countryItemLeft}>
                      <View style={[styles.countryListBadge, palette.countryBadge]}>
                        <Text style={[styles.countryBadgeText, palette.countryBadgeText]}>{country.code}</Text>
                      </View>
                      <View>
                        <Text style={[styles.countryName, palette.countryName]}>{country.name}</Text>
                        <Text style={[styles.countryCodeText, palette.countryCodeText]}>{country.code}</Text>
                      </View>
                    </View>
                    <Text style={[styles.countryItemDialCode, palette.countryItemDialCode]}>{country.dialCode}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 0.3,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 16,
    overflow: 'hidden',
  },
  inputRowError: {
    borderColor: '#EF4444',
  },
  countryButton: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
    borderRightWidth: 1,
  },
  countryBadge: {
    minWidth: 34,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countryListBadge: {
    minWidth: 36,
    height: 26,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  countryBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_700Bold',
    letterSpacing: 0.4,
  },
  countryDialCode: {
    fontSize: 15,
    fontFamily: 'Inter_600SemiBold',
  },
  numberInput: {
    flex: 1,
    minHeight: 56,
    paddingHorizontal: 14,
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    outlineStyle: 'none' as any,
  },
  helperText: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
  },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 4,
  },
  errorIcon: {
    marginRight: 4,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    fontFamily: 'Inter_600SemiBold',
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    maxHeight: '80%',
    borderRadius: 24,
    padding: 18,
    borderWidth: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
  },
  searchWrap: {
    minHeight: 48,
    borderRadius: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    marginBottom: 14,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    outlineStyle: 'none' as any,
  },
  countryList: {
    maxHeight: 420,
  },
  countryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderRadius: 14,
    marginBottom: 8,
  },
  countryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexShrink: 1,
  },
  countryName: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
  },
  countryCodeText: {
    fontSize: 11,
    marginTop: 2,
    fontFamily: 'Inter_400Regular',
  },
  countryItemDialCode: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
  },
});

const darkTheme = StyleSheet.create({
  label: {
    color: Colors.textSecondary,
  },
  inputRow: {
    backgroundColor: 'rgba(26, 26, 46, 0.75)',
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  countryButton: {
    backgroundColor: 'rgba(26, 32, 54, 0.9)',
    borderRightColor: 'rgba(255, 255, 255, 0.12)',
  },
  countryBadge: {
    backgroundColor: 'rgba(0, 217, 245, 0.12)',
  },
  countryBadgeText: {
    color: '#CFFAFE',
  },
  countryDialCode: {
    color: Colors.text,
  },
  numberInput: {
    color: Colors.text,
  },
  helperText: {
    color: Colors.textMuted,
  },
  modalCard: {
    backgroundColor: '#111827',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalTitle: {
    color: '#FFFFFF',
  },
  searchWrap: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  searchInput: {
    color: '#FFFFFF',
  },
  countryItem: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  countryItemSelected: {
    backgroundColor: 'rgba(246, 192, 47, 0.16)',
  },
  countryName: {
    color: '#FFFFFF',
  },
  countryCodeText: {
    color: Colors.textMuted,
  },
  countryItemDialCode: {
    color: Colors.primary,
  },
});

const lightTheme = StyleSheet.create({
  label: {
    color: '#4B5563',
  },
  inputRow: {
    backgroundColor: '#FFFFFF',
    borderColor: '#D1D5DB',
  },
  countryButton: {
    backgroundColor: '#F9FAFB',
    borderRightColor: '#E5E7EB',
  },
  countryBadge: {
    backgroundColor: '#E5EEF9',
  },
  countryBadgeText: {
    color: '#1E3A8A',
  },
  countryDialCode: {
    color: '#111827',
  },
  numberInput: {
    color: '#000000',
  },
  helperText: {
    color: '#6B7280',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
  },
  modalTitle: {
    color: '#111827',
  },
  searchWrap: {
    backgroundColor: '#F9FAFB',
    borderColor: '#E5E7EB',
  },
  searchInput: {
    color: '#111827',
  },
  countryItem: {
    backgroundColor: '#F9FAFB',
  },
  countryItemSelected: {
    backgroundColor: '#FEF3C7',
  },
  countryName: {
    color: '#111827',
  },
  countryCodeText: {
    color: '#6B7280',
  },
  countryItemDialCode: {
    color: '#111827',
  },
});
