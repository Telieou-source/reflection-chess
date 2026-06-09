import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Board from '@/components/Board';
import colors from '@/constants/colors';
import { LEVELS } from '@/constants/levels';
import { useGame } from '@/context/GameContext';

const c = colors.light;

function WinOverlay({ level, onNext, onMenu, onRetry }: {
  level: number;
  onNext: () => void;
  onMenu: () => void;
  onRetry: () => void;
}) {
  const scale = useRef(new Animated.Value(0.6)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 300, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.winOverlay, { opacity }]}>
      <Animated.View style={[styles.winCard, { transform: [{ scale }] }]}>
        <View style={styles.winIcon}>
          <Feather name="zap" size={36} color={c.laser} />
        </View>
        <Text style={styles.winTitle}>Solved!</Text>
        <Text style={styles.winSub}>Level {level} complete</Text>

        <View style={styles.winButtons}>
          {level < LEVELS.length && (
            <TouchableOpacity style={styles.winPrimaryBtn} onPress={onNext} activeOpacity={0.8}>
              <Text style={styles.winPrimaryText}>Next Level</Text>
              <Feather name="chevron-right" size={18} color="#000" />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.winSecondaryBtn} onPress={onRetry} activeOpacity={0.8}>
            <Feather name="refresh-cw" size={16} color={c.foreground} />
            <Text style={styles.winSecondaryText}>Replay</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.winSecondaryBtn} onPress={onMenu} activeOpacity={0.8}>
            <Feather name="list" size={16} color={c.foreground} />
            <Text style={styles.winSecondaryText}>Levels</Text>
          </TouchableOpacity>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, loadLevel, tapCell, setMirrorType, undo, resetLevel } = useGame();

  const levelId = parseInt(id ?? '1', 10);

  useEffect(() => {
    if (!state || state.level.id !== levelId) {
      loadLevel(levelId);
    }
  }, [levelId, loadLevel, state]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleTap = useCallback((row: number, col: number) => {
    if (!state) return;
    const cell = state.grid[row][col];
    if (!cell.fixed && cell.kind !== 'target' && cell.kind !== 'laser' && cell.kind !== 'wall') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    tapCell(row, col);
  }, [state, tapCell]);

  const handleNext = useCallback(() => {
    const nextId = levelId + 1;
    loadLevel(nextId);
    router.replace({ pathname: '/game', params: { id: String(nextId) } });
  }, [levelId, loadLevel, router]);

  const handleMenu = useCallback(() => {
    router.push('/levels');
  }, [router]);

  const handleRetry = useCallback(() => {
    resetLevel();
  }, [resetLevel]);

  if (!state || state.level.id !== levelId) {
    return (
      <View style={[styles.container, styles.loading, { paddingTop: topPad }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const { level, grid, hitTargets, isSolved, remainingMirrors, selectedMirrorType } = state;

  return (
    <View style={[styles.container, { paddingTop: topPad, paddingBottom: botPad }]}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.headerBtn}>
          <Feather name="arrow-left" size={22} color={c.foreground} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.levelLabel}>Level {level.id}</Text>
          <Text style={styles.levelName}>{level.name}</Text>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity onPress={undo} style={styles.headerBtn}>
            <Feather name="corner-up-left" size={20} color={c.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={resetLevel} style={styles.headerBtn}>
            <Feather name="refresh-cw" size={18} color={c.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.boardArea}>
        <Board
          grid={grid}
          gridSize={level.gridSize}
          hitTargets={hitTargets}
          onTapCell={handleTap}
        />
      </View>

      <View style={styles.controls}>
        <View style={styles.mirrorCounter}>
          <Feather name="layers" size={14} color={c.mutedForeground} />
          <Text style={styles.counterText}>
            {remainingMirrors} mirror{remainingMirrors !== 1 ? 's' : ''} left
          </Text>
        </View>

        <View style={styles.mirrorPicker}>
          <TouchableOpacity
            style={[styles.mirrorBtn, selectedMirrorType === 'slash' && styles.mirrorBtnActive]}
            onPress={() => setMirrorType('slash')}
            activeOpacity={0.7}
          >
            <View style={styles.mirrorPreview}>
              <View
                style={[
                  styles.mirrorPreviewLine,
                  { transform: [{ rotate: '-45deg' }] },
                  selectedMirrorType === 'slash' && styles.mirrorPreviewLineActive,
                ]}
              />
            </View>
            <Text style={[styles.mirrorBtnLabel, selectedMirrorType === 'slash' && styles.mirrorBtnLabelActive]}>
              /
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mirrorBtn, selectedMirrorType === 'backslash' && styles.mirrorBtnActive]}
            onPress={() => setMirrorType('backslash')}
            activeOpacity={0.7}
          >
            <View style={styles.mirrorPreview}>
              <View
                style={[
                  styles.mirrorPreviewLine,
                  { transform: [{ rotate: '45deg' }] },
                  selectedMirrorType === 'backslash' && styles.mirrorPreviewLineActive,
                ]}
              />
            </View>
            <Text style={[styles.mirrorBtnLabel, selectedMirrorType === 'backslash' && styles.mirrorBtnLabelActive]}>
              \
            </Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>Tap cell to place · Tap mirror to cycle</Text>
      </View>

      {isSolved && (
        <WinOverlay
          level={level.id}
          onNext={handleNext}
          onMenu={handleMenu}
          onRetry={handleRetry}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: c.background,
  },
  loading: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: c.mutedForeground,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerBtn: {
    padding: 6,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 2,
  },
  levelLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: c.laser,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  levelName: {
    fontSize: 16,
    fontFamily: 'Inter_600SemiBold',
    color: c.foreground,
  },
  boardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  controls: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: 12,
    alignItems: 'center',
  },
  mirrorCounter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  counterText: {
    fontSize: 13,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
  },
  mirrorPicker: {
    flexDirection: 'row',
    gap: 12,
  },
  mirrorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
  },
  mirrorBtnActive: {
    borderColor: c.laser,
    backgroundColor: 'rgba(0, 212, 255, 0.08)',
  },
  mirrorPreview: {
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mirrorPreviewLine: {
    width: 34,
    height: 3,
    backgroundColor: c.mirrorFixed,
    borderRadius: 2,
  },
  mirrorPreviewLineActive: {
    backgroundColor: c.mirror,
  },
  mirrorBtnLabel: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: c.mutedForeground,
    lineHeight: 26,
  },
  mirrorBtnLabelActive: {
    color: c.laser,
  },
  hint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
    opacity: 0.7,
  },
  winOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7, 14, 28, 0.85)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winCard: {
    backgroundColor: c.card,
    borderRadius: 24,
    padding: 32,
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: c.border,
    width: '80%',
    maxWidth: 320,
    shadowColor: c.laser,
    shadowOpacity: 0.2,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 0 },
  },
  winIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  winTitle: {
    fontSize: 32,
    fontFamily: 'Inter_700Bold',
    color: c.laser,
  },
  winSub: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
    marginBottom: 12,
  },
  winButtons: {
    width: '100%',
    gap: 10,
  },
  winPrimaryBtn: {
    backgroundColor: c.laser,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  winPrimaryText: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  winSecondaryBtn: {
    backgroundColor: c.muted,
    borderRadius: 12,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: c.border,
  },
  winSecondaryText: {
    fontSize: 14,
    fontFamily: 'Inter_500Medium',
    color: c.foreground,
  },
});
