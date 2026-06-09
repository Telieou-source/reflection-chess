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
const TOTAL_GENERATED_PAGES = 20; // shows levels 11-210
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

  const generatedLevels = useMemo(() => {
    const start = TUTORIAL_COUNT + 1 + generatedPage * GENERATED_PAGE_SIZE;
    return Array.from({ length: GENERATED_PAGE_SIZE }, (_, i) => getLevel(start + i));
  }, [generatedPage]);

  const firstUnlocked = useMemo(() => {
    if (completedLevels.size === 0) return 1;
    for (let i = 1; i <= TUTORIAL_COUNT; i++) {
      if (!completedLevels.has(i)) return i;
    }
    // All tutorials done — all generated levels unlocked
    return TUTORIAL_COUNT + 1;
  }, [completedLevels]);

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
        {/* Tutorial levels */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Tutorial</Text>
            <Text style={styles.sectionSub}>10 hand-crafted puzzles</Text>
          </View>
          {LEVELS.map((level, idx) => {
            const completed = completedLevels.has(level.id);
            const prevDone = idx === 0 || completedLevels.has(LEVELS[idx - 1].id);
            const locked = !prevDone && !completed;
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
        </View>

        {/* Generated levels */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.sectionTitle}>Endless</Text>
              <Text style={styles.sectionSub}>Infinite procedural puzzles</Text>
            </View>
            <View style={styles.pageControls}>
              <TouchableOpacity
                style={[styles.pageBtn, generatedPage === 0 && styles.pageBtnDisabled]}
                onPress={() => setGeneratedPage(p => Math.max(0, p - 1))}
                disabled={generatedPage === 0}
              >
                <Feather name="chevron-left" size={18} color={generatedPage === 0 ? c.mutedForeground : c.foreground} />
              </TouchableOpacity>
              <Text style={styles.pageNum}>
                {TUTORIAL_COUNT + 1 + generatedPage * GENERATED_PAGE_SIZE}–
                {TUTORIAL_COUNT + generatedPage * GENERATED_PAGE_SIZE + GENERATED_PAGE_SIZE}
              </Text>
              <TouchableOpacity
                style={[styles.pageBtn, generatedPage >= TOTAL_GENERATED_PAGES - 1 && styles.pageBtnDisabled]}
                onPress={() => setGeneratedPage(p => Math.min(TOTAL_GENERATED_PAGES - 1, p + 1))}
                disabled={generatedPage >= TOTAL_GENERATED_PAGES - 1}
              >
                <Feather name="chevron-right" size={18} color={generatedPage >= TOTAL_GENERATED_PAGES - 1 ? c.mutedForeground : c.foreground} />
              </TouchableOpacity>
            </View>
          </View>

          {generatedLevels.map(level => {
            const completed = completedLevels.has(level.id);
            const allTutorialsDone = LEVELS.every(l => completedLevels.has(l.id));
            const locked = !allTutorialsDone && !completed;
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
        </View>
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
  content: { padding: 16, gap: 24 },
  section: { gap: 8 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 4,
    paddingHorizontal: 4,
  },
  sectionTitle: { fontSize: 16, fontFamily: 'Inter_700Bold', color: c.foreground },
  sectionSub: { fontSize: 12, fontFamily: 'Inter_400Regular', color: c.mutedForeground, marginTop: 2 },
  pageControls: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  pageBtn: {
    padding: 6,
    backgroundColor: c.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  pageBtnDisabled: { opacity: 0.4 },
  pageNum: { fontSize: 12, fontFamily: 'Inter_500Medium', color: c.mutedForeground, minWidth: 54, textAlign: 'center' },
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
