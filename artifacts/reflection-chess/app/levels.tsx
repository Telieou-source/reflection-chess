import { Feather } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
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
import { useGame } from '@/context/GameContext';

const c = colors.light;

export default function LevelsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { completedLevels, loadLevel } = useGame();

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  function handleLevel(id: number) {
    loadLevel(id);
    router.push({ pathname: '/game', params: { id: String(id) } });
  }

  const difficulties = ['Beginner', 'Beginner', 'Beginner', 'Intermediate', 'Intermediate', 'Intermediate', 'Advanced', 'Advanced', 'Expert', 'Expert'];

  return (
    <View style={[styles.container, { paddingTop: topPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Levels</Text>
        <View style={{ width: 36 }} />
      </View>

      <ScrollView
        contentContainerStyle={[styles.listContent, { paddingBottom: botPad + 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {LEVELS.map((level, idx) => {
          const done = completedLevels.includes(level.id);
          const prev = idx === 0 || completedLevels.includes(LEVELS[idx - 1].id);
          const locked = !prev && !done;

          return (
            <TouchableOpacity
              key={level.id}
              style={[styles.levelCard, locked && styles.levelCardLocked]}
              onPress={() => !locked && handleLevel(level.id)}
              activeOpacity={locked ? 1 : 0.75}
            >
              <View style={[styles.levelNum, done && styles.levelNumDone, locked && styles.levelNumLocked]}>
                {done ? (
                  <Feather name="check" size={18} color={c.background} />
                ) : locked ? (
                  <Feather name="lock" size={16} color={c.mutedForeground} />
                ) : (
                  <Text style={styles.levelNumText}>{level.id}</Text>
                )}
              </View>

              <View style={styles.levelInfo}>
                <Text style={[styles.levelName, locked && styles.textLocked]}>{level.name}</Text>
                <Text style={[styles.levelDesc, locked && styles.textLocked]} numberOfLines={1}>
                  {level.description}
                </Text>
                <View style={styles.levelMeta}>
                  <Text style={[styles.levelDiff, locked && styles.textLocked]}>
                    {difficulties[idx]}
                  </Text>
                  <View style={styles.dot} />
                  <Text style={[styles.levelDiff, locked && styles.textLocked]}>
                    {level.gridSize}×{level.gridSize}
                  </Text>
                  <View style={styles.dot} />
                  <Text style={[styles.levelDiff, locked && styles.textLocked]}>
                    {level.playerMirrors} mirror{level.playerMirrors !== 1 ? 's' : ''}
                  </Text>
                </View>
              </View>

              {!locked && (
                <Feather
                  name={done ? 'refresh-cw' : 'play'}
                  size={18}
                  color={done ? c.mutedForeground : c.laser}
                />
              )}
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
    justifyContent: 'space-between',
  },
  backBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Inter_600SemiBold',
    color: c.foreground,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  levelCard: {
    backgroundColor: c.card,
    borderRadius: 14,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    borderWidth: 1,
    borderColor: c.border,
  },
  levelCardLocked: {
    opacity: 0.5,
  },
  levelNum: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: c.muted,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: c.border,
  },
  levelNumDone: {
    backgroundColor: c.success,
    borderColor: c.success,
  },
  levelNumLocked: {
    backgroundColor: c.wall,
    borderColor: c.border,
  },
  levelNumText: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: c.laser,
  },
  levelInfo: {
    flex: 1,
    gap: 3,
  },
  levelName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: c.foreground,
  },
  levelDesc: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
  },
  levelMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  levelDiff: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: c.mutedForeground,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: c.mutedForeground,
    opacity: 0.4,
  },
  textLocked: {
    color: c.mutedForeground,
  },
});
