import React from 'react';
import { StyleSheet, Text, View, TextInput, ScrollView, Pressable, Platform } from 'react-native';
import { useTheme } from '../../context/ThemeContext';
import { useLanguage } from '../../lib/i18n';

interface ClaudeWorkoutFiltersProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedPurpose: string[];
  onSelectPurpose: (p: string) => void;
  selectedDifficulty: string;
  onSelectDifficulty: (d: string) => void;
  selectedDuration: string;
  onSelectDuration: (d: string) => void;
  selectedKit: string;
  onSelectKit: (k: string) => void;
  resultCountText?: string;
}

const GOLD = '#C9943A';
const OBSIDIAN = '#0D0D0D';
const IVORY = '#F7F3EE';

const CLASH = Platform.select({ web: 'Clash Display', default: 'ClashDisplay-Bold' });
const DMSANS = Platform.select({ web: 'DM Sans', default: 'DMSans-SemiBold' });
const INTER = Platform.select({ web: 'Inter', default: 'Inter-Regular' });
const MONO = Platform.select({ web: 'JetBrains Mono', default: 'JetBrainsMono-Bold' });

const PURPOSES = ['All', 'Strength', 'Full Body Workout', 'Mobility', 'Core', 'Conditioning', 'Recovery', 'Lower body', 'Upper body'];
const DIFFICULTIES = ['Any', 'Beginner', 'Intermediate', 'Advanced'];
const DURATIONS = ['Any', '15', '30', '45', '60'];
const KITS = ['Any', 'No kit', 'Dumbbells', 'Bands', 'Mat'];

export default function ClaudeWorkoutFilters({
  searchQuery,
  onSearchChange,
  selectedPurpose,
  onSelectPurpose,
  selectedDifficulty,
  onSelectDifficulty,
  selectedDuration,
  onSelectDuration,
  selectedKit,
  onSelectKit,
  resultCountText,
}: ClaudeWorkoutFiltersProps) {
  const { isDark } = useTheme();
  const { t } = useLanguage();

  return (
    <View style={styles.container}>
      {/* Header with Title & Count */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{t('The whole library')}</Text>
        <Text style={styles.totalBadge}>{t('170 workouts')}</Text>
      </View>

      {/* Search Input */}
      <View style={styles.searchBox}>
        <TextInput
          style={[
            styles.searchInput,
            Platform.select({
              web: {
                outlineStyle: 'none',
                outlineWidth: 0,
                outlineColor: 'transparent',
                borderWidth: 0,
                borderColor: 'transparent',
                boxShadow: 'none',
              } as any,
            }),
          ]}
          placeholder={t('Search by name, muscle or kit…')}
          placeholderTextColor="rgba(247, 243, 238, 0.45)"
          value={searchQuery}
          onChangeText={onSearchChange}
        />
      </View>

      {/* Purpose Filter Row */}
      <SlideableChipsRow
        label="PURPOSE"
        items={PURPOSES}
        selectedItem={selectedPurpose}
        onSelect={onSelectPurpose}
        paddingTop={16}
      />

      <SlideableChipsRow
        label="DIFFICULTY"
        items={DIFFICULTIES}
        selectedItem={selectedDifficulty}
        onSelect={onSelectDifficulty}
        paddingTop={14}
      />

      {/* Minutes Filter Row */}
      <SlideableChipsRow
        label="MINUTES"
        items={DURATIONS}
        selectedItem={selectedDuration}
        onSelect={onSelectDuration}
        paddingTop={14}
      />

      {/* Kit Filter Row */}
      <SlideableChipsRow
        label="KIT"
        items={KITS}
        selectedItem={selectedKit}
        onSelect={onSelectKit}
        paddingTop={14}
      />

      {/* Result Count Banner */}
      <Text style={styles.resultCount}>{resultCountText || t('170 of 170 workouts · shortest first')}</Text>
    </View>
  );
}

interface SlideableChipsRowProps {
  label: string;
  items: string[];
  selectedItem: string | string[];
  onSelect: (item: string) => void;
  paddingTop?: number;
}

function SlideableChipsRow({
  label,
  items,
  selectedItem,
  onSelect,
  paddingTop = 16,
}: SlideableChipsRowProps) {
  const { t } = useLanguage();
  const scrollRef = React.useRef<ScrollView>(null);
  const isMouseDown = React.useRef(false);
  const startX = React.useRef(0);
  const scrollStartLeft = React.useRef(0);
  const hasDragged = React.useRef(false);

  const getDomNode = () => {
    return (
      (scrollRef.current as any)?.getScrollResponder?.()?.getScrollableNode?.() ||
      (scrollRef.current as any)
    );
  };

  const handleMouseDown = (e: any) => {
    if (Platform.OS !== 'web') return;
    isMouseDown.current = true;
    hasDragged.current = false;
    startX.current = e.nativeEvent?.pageX ?? e.pageX ?? 0;
    const node = getDomNode();
    scrollStartLeft.current = node?.scrollLeft || 0;
  };

  const handleMouseMove = (e: any) => {
    if (Platform.OS !== 'web' || !isMouseDown.current) return;
    const currentX = e.nativeEvent?.pageX ?? e.pageX ?? 0;
    const diff = currentX - startX.current;
    if (Math.abs(diff) > 4) {
      hasDragged.current = true;
    }
    const node = getDomNode();
    if (node) {
      node.scrollLeft = scrollStartLeft.current - diff;
    }
  };

  const handleMouseUp = () => {
    if (Platform.OS !== 'web') return;
    isMouseDown.current = false;
  };

  React.useEffect(() => {
    if (Platform.OS !== 'web') return;
    const node = getDomNode();
    if (!node) return;

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) < Math.abs(e.deltaY) && e.deltaY !== 0) {
        node.scrollLeft += e.deltaY * 0.8;
      }
    };

    node.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      node.removeEventListener('wheel', onWheel);
    };
  }, []);

  return (
    <View style={[styles.filterRow, { paddingTop }]}>
      <Text style={styles.filterLabel}>{t(label)}</Text>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={true}
        contentContainerStyle={styles.chipsScroll}
        style={
          Platform.OS === 'web'
            ? ({
                cursor: 'grab',
                userSelect: 'none',
                WebkitOverflowScrolling: 'touch',
              } as any)
            : undefined
        }
        {...(Platform.OS === 'web'
          ? {
              onMouseDown: handleMouseDown,
              onMouseMove: handleMouseMove,
              onMouseUp: handleMouseUp,
              onMouseLeave: handleMouseUp,
            }
          : {})}
      >
        {items.map((item) => {
          const active = Array.isArray(selectedItem) ? selectedItem.includes(item) : item === selectedItem;
          return (
            <Pressable
              key={item}
              onPress={() => {
                if (hasDragged.current) return;
                onSelect(item);
              }}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {t(item)}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 26,
    paddingTop: 22,
    borderTopWidth: 1,
    borderTopColor: 'rgba(247, 243, 238, 0.14)',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: {
    fontFamily: CLASH,
    fontSize: 17,
    fontWeight: '600',
    color: IVORY,
  },
  totalBadge: {
    fontFamily: MONO,
    fontSize: 11.5,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.45)',
  },
  searchBox: {
    marginHorizontal: 20,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.18)',
    borderRadius: 14,
    paddingHorizontal: 15,
    paddingVertical: 13,
    backgroundColor: 'transparent',
  },
  searchInput: {
    fontFamily: INTER,
    fontSize: 14.5,
    color: IVORY,
    padding: 0,
    borderWidth: 0,
    borderColor: 'transparent',
    backgroundColor: 'transparent',
    outlineStyle: 'none' as any,
    outlineWidth: 0 as any,
    outlineColor: 'transparent' as any,
  },
  filterRow: {
    paddingTop: 16,
  },
  filterLabel: {
    fontFamily: DMSANS,
    fontSize: 10,
    fontWeight: '500',
    letterSpacing: 1.4,
    color: 'rgba(247, 243, 238, 0.42)',
    paddingHorizontal: 20,
    paddingBottom: 9,
  },
  chipsScroll: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 6,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 15,
    borderRadius: 99,
    borderWidth: 1,
    borderColor: 'rgba(247, 243, 238, 0.22)',
    backgroundColor: 'transparent',
    ...(Platform.OS === 'web' ? { whiteSpace: 'nowrap' as any } : {}),
  },
  chipActive: {
    backgroundColor: GOLD,
    borderColor: GOLD,
  },
  chipText: {
    fontFamily: DMSANS,
    fontSize: 13,
    fontWeight: '500',
    color: 'rgba(247, 243, 238, 0.7)',
  },
  chipTextActive: {
    color: OBSIDIAN,
    fontWeight: '700',
  },
  resultCount: {
    fontFamily: MONO,
    fontSize: 12,
    fontWeight: '700',
    color: GOLD,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
});
