import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import colors from '@/constants/colors';
import { LEVELS } from '@/constants/levels';
import { getLevel } from '@/context/GameContext';
import { useGame } from '@/context/GameContext';

const c = colors.light;

const GENERATED_PAGE_SIZE = 10;
const TOTAL_GENERATED_PAGES = 20;
const TUTORIAL_COUNT = LEVELS.length;

function LevelCard({
  id,
  name,
  description,
  completed,
  locked,
  onPress,
}: {
  id: number;
  name: string;
  description: string;
  completed: boolean;
  locked: boolean;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={[styles.card, locked && styles.cardLocked]}
      onPress={() => !locked && onPress()}
      activeOpacity={locked ? 1 : 0.72}
    >
      <View style={[styles.numBadge, completed && styles.numBadgeDone, locked && styles.numBadgeLocked]}>
        {completed ? (
          <Feather name="check" size={15} color="#000" />
        ) : locked ? (
          <Feather name="lock" size={13} color={c.mutedForeground} />
        ) : (
          <Text style={styles.numText}>{id}</Text>
        )}
      </View>
      <View style={styles.cardInfo}>
        <Text style={[styles.cardName, locked && styles.textDim]}>{name}</Text>
        <Text style={[styles.cardDesc, locked && styles.textDim]} numberOfLines={1}>{description}</Text>
      </View>
      {!locked && (
        <Feather name={completed ? 'refresh-cw' : 'chevron-right'} size={16}
          color={completed ? c.mutedForeground : c.laser} />
      )}
    </TouchableOpacity>
  );
}

export default function LevelsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completedLevels, loadLevel } = useGame();
  const [generatedPage, setGeneratedPage] = useState(0);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  function handleLevel(id: number) {
    loadLevel(id);
    router.push({ pathname: '/game', params: { id: String(id) } });
  }

  function isLocked(id: number): boolean {
    if (completedLevels.has(id)) return false;
    if (id === 1) return false;
    return !completedLevels.has(id - 1);
  }

  const generatedLevels = useMemo(() => {
    const start = TUTORIAL_COUNT + 1 + generatedPage * GENERATED_PAGE_SIZE;
    return Array.from({ length: GENERATED_PAGE_SIZE }, (_, i) => getLevel(start + i));
  }, [generatedPage]);

  const generatedStart = TUTORIAL_COUNT + 1 + generatedPage * GENERATED_PAGE_SIZE;
  const generatedEnd   = generatedStart + GENERATED_PAGE_SIZE - 1;

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Levels</Text>
        <View style={styles.headerBadge}>
          <Text style={styles.headerBadgeText}>{completedLevels.size} solved</Text>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Hand-crafted levels 1–10 */}
        {LEVELS.map((level, idx) => {
          const completed = completedLevels.has(level.id);
          const locked = isLocked(level.id);
          return (
            <LevelCard
              key={level.id}
              id={level.id}
              name={level.name}
              description={level.description}
              completed={completed}
              locked={locked}
              onPress={() => handleLevel(level.id)}
            />
          );
        })}

        {/* Pagination separator for generated levels */}
        <View style={styles.separator}>
          <View style={styles.separatorLine} />
          <View style={styles.pageControls}>
            <TouchableOpacity
              style={[styles.pageBtn, generatedPage === 0 && styles.pageBtnDisabled]}
              onPress={() => setGeneratedPage(p => Math.max(0, p - 1))}
              disabled={generatedPage === 0}
            >
              <Feather name="chevron-left" size={16} color={generatedPage === 0 ? c.mutedForeground : c.foreground} />
            </TouchableOpacity>
            <Text style={styles.pageLabel}>{generatedStart}–{generatedEnd}</Text>
            <TouchableOpacity
              style={[styles.pageBtn, generatedPage >= TOTAL_GENERATED_PAGES - 1 && styles.pageBtnDisabled]}
              onPress={() => setGeneratedPage(p => Math.min(TOTAL_GENERATED_PAGES - 1, p + 1))}
              disabled={generatedPage >= TOTAL_GENERATED_PAGES - 1}
            >
              <Feather name="chevron-right" size={16} color={generatedPage >= TOTAL_GENERATED_PAGES - 1 ? c.mutedForeground : c.foreground} />
            </TouchableOpacity>
          </View>
          <View style={styles.separatorLine} />
        </View>

        {/* Generated levels */}
        {generatedLevels.map(level => (
          <LevelCard
            key={level.id}
            id={level.id}
            name={level.name}
            description={level.description}
            completed={completedLevels.has(level.id)}
            locked={isLocked(level.id)}
            onPress={() => handleLevel(level.id)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    justifyContent: 'space-between',
  },
  backBtn: { padding: 6 },
  headerTitle: { fontSize: 18, fontFamily: 'Inter_600SemiBold', color: c.foreground },
  headerBadge: {
    backgroundColor: 'rgba(0,212,255,0.12)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(0,212,255,0.25)',
  },
  headerBadgeText: { fontSize: 12, fontFamily: 'Inter_600SemiBold', color: c.laser },
  content: { padding: 16, gap: 8 },
  separator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginVertical: 8,
  },
  separatorLine: { flex: 1, height: 1, backgroundColor: c.border },
  pageControls: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  pageBtn: {
    padding: 5,
    backgroundColor: c.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageLabel: { fontSize: 12, fontFamily: 'Inter_500Medium', color: c.mutedForeground, minWidth: 48, textAlign: 'center' },
  card: {
    backgroundColor: c.card,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: c.border,
  },
  cardLocked: { opacity: 0.45 },
  numBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: c.muted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  numBadgeDone: { backgroundColor: c.targetHit, borderColor: c.targetHit },
  numBadgeLocked: { backgroundColor: c.wall },
  numText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: c.laser },
  cardInfo: { flex: 1, gap: 2 },
  cardName: { fontSize: 14, fontFamily: 'Inter_600SemiBold', color: c.foreground },
  cardDesc: { fontSize: 12, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  textDim: { color: c.mutedForeground },
});
