import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  const scale = useRef(new Animated.Value(0.65)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, tension: 65, friction: 8 }),
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  return (
    <Animated.View style={[styles.winOverlay, { opacity }]}>
      <Animated.View style={[styles.winCard, { transform: [{ scale }] }]}>
        <View style={styles.winIcon}>
          <Feather name="zap" size={36} color={c.laser} />
        </View>
        <Text style={styles.winTitle}>Beam on Target!</Text>
        <Text style={styles.winSub}>Level {level} complete</Text>
        <View style={styles.winButtons}>
          {level < LEVELS.length && (
            <TouchableOpacity style={styles.winPrimaryBtn} onPress={onNext} activeOpacity={0.8}>
              <Text style={styles.winPrimaryText}>Next Level</Text>
              <Feather name="chevron-right" size={18} color="#000" />
            </TouchableOpacity>
          )}
          <View style={styles.winSecondaryRow}>
            <TouchableOpacity style={[styles.winSecBtn, { flex: 1 }]} onPress={onRetry} activeOpacity={0.8}>
              <Feather name="refresh-cw" size={15} color={c.foreground} />
              <Text style={styles.winSecText}>Replay</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.winSecBtn, { flex: 1 }]} onPress={onMenu} activeOpacity={0.8}>
              <Feather name="list" size={15} color={c.foreground} />
              <Text style={styles.winSecText}>Levels</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function FirstRunBanner({ onDismiss, onHelp }: { onDismiss: () => void; onHelp: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(opacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
  }, [opacity]);
  return (
    <Animated.View style={[styles.banner, { opacity }]}>
      <View style={styles.bannerContent}>
        <Feather name="info" size={16} color={c.laser} />
        <Text style={styles.bannerText}>
          Place mirrors to redirect the laser to the bullseye target.
        </Text>
      </View>
      <View style={styles.bannerActions}>
        <TouchableOpacity onPress={onHelp} style={styles.bannerBtn}>
          <Text style={styles.bannerBtnText}>How to Play</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onDismiss} style={styles.bannerClose}>
          <Feather name="x" size={16} color={c.mutedForeground} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, loadLevel, tapCell, setMirrorType, undo, resetLevel } = useGame();
  const [showBanner, setShowBanner] = useState(true);

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
    setShowBanner(false);
  }, [state, tapCell]);

  const handleNext = useCallback(() => {
    const nextId = levelId + 1;
    loadLevel(nextId);
    router.replace({ pathname: '/game', params: { id: String(nextId) } });
  }, [levelId, loadLevel, router]);

  if (!state || state.level.id !== levelId) {
    return (
      <View style={[styles.container, styles.loading, { paddingTop: topPad }]}>
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  const { level, grid, hitTargets, isSolved, remainingMirrors, selectedMirrorType } = state;

  const isLevel1 = level.id === 1;
  const hintCell = isLevel1 && remainingMirrors === level.playerMirrors
    ? { row: 0, col: 3 }
    : null;

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
          <TouchableOpacity onPress={() => router.push('/how-to-play')} style={styles.headerBtn}>
            <Feather name="help-circle" size={19} color={c.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={undo} style={styles.headerBtn}>
            <Feather name="corner-up-left" size={19} color={c.mutedForeground} />
          </TouchableOpacity>
          <TouchableOpacity onPress={resetLevel} style={styles.headerBtn}>
            <Feather name="refresh-cw" size={17} color={c.mutedForeground} />
          </TouchableOpacity>
        </View>
      </View>

      {showBanner && isLevel1 && !isSolved && (
        <FirstRunBanner
          onDismiss={() => setShowBanner(false)}
          onHelp={() => {
            setShowBanner(false);
            router.push('/how-to-play');
          }}
        />
      )}

      <View style={styles.boardArea}>
        {hintCell && (
          <View style={styles.hintLabel}>
            <Feather name="arrow-down" size={12} color={c.laser} />
            <Text style={styles.hintLabelText}>Try tapping here</Text>
          </View>
        )}
        <Board
          grid={grid}
          gridSize={level.gridSize}
          hitTargets={hitTargets}
          onTapCell={handleTap}
          hintCell={hintCell}
        />
        {level.gridSize <= 5 && (
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <Feather name="zap" size={12} color={c.source} />
              <Text style={styles.legendText}>Laser source</Text>
            </View>
            <View style={styles.legendDot} />
            <View style={styles.legendItem}>
              <View style={{ width: 10, height: 10, borderRadius: 5, borderWidth: 1.5, borderColor: c.target }} />
              <Text style={styles.legendText}>Target</Text>
            </View>
            <View style={styles.legendDot} />
            <View style={styles.legendItem}>
              <View style={{ width: 14, height: 2, backgroundColor: c.mirror, borderRadius: 1, transform: [{ rotate: '-45deg' }] }} />
              <Text style={styles.legendText}>Mirror</Text>
            </View>
          </View>
        )}
      </View>

      <View style={styles.controls}>
        <View style={styles.controlsRow}>
          <View style={styles.mirrorCounter}>
            <Feather name="layers" size={13} color={c.mutedForeground} />
            <Text style={styles.counterText}>
              {remainingMirrors} left
            </Text>
          </View>
          <Text style={styles.controlsLabel}>Select mirror type:</Text>
        </View>

        <View style={styles.mirrorPicker}>
          <TouchableOpacity
            style={[styles.mirrorBtn, selectedMirrorType === 'slash' && styles.mirrorBtnActive]}
            onPress={() => setMirrorType('slash')}
            activeOpacity={0.7}
          >
            <View style={styles.mirrorPreviewWrap}>
              <View
                style={[
                  styles.mirrorPreviewLine,
                  { transform: [{ rotate: '-45deg' }] },
                  selectedMirrorType === 'slash' && styles.mirrorPreviewLineActive,
                ]}
              />
            </View>
            <View>
              <Text style={[styles.mirrorSymbol, selectedMirrorType === 'slash' && styles.mirrorSymbolActive]}>
                /
              </Text>
              <Text style={styles.mirrorSubLabel}>Slash</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mirrorBtn, selectedMirrorType === 'backslash' && styles.mirrorBtnActive]}
            onPress={() => setMirrorType('backslash')}
            activeOpacity={0.7}
          >
            <View style={styles.mirrorPreviewWrap}>
              <View
                style={[
                  styles.mirrorPreviewLine,
                  { transform: [{ rotate: '45deg' }] },
                  selectedMirrorType === 'backslash' && styles.mirrorPreviewLineActive,
                ]}
              />
            </View>
            <View>
              <Text style={[styles.mirrorSymbol, selectedMirrorType === 'backslash' && styles.mirrorSymbolActive]}>
                \
              </Text>
              <Text style={styles.mirrorSubLabel}>Backslash</Text>
            </View>
          </TouchableOpacity>
        </View>

        <Text style={styles.hint}>
          Tap empty cell to place · Tap mirror to cycle {'->'} rotate {'->'} remove
        </Text>
      </View>

      {isSolved && (
        <WinOverlay
          level={level.id}
          onNext={handleNext}
          onMenu={() => router.push('/levels')}
          onRetry={resetLevel}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: c.background },
  loading: { alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: c.mutedForeground, fontFamily: 'Inter_400Regular', fontSize: 16 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: c.border,
  },
  headerBtn: { padding: 6 },
  headerCenter: { flex: 1, alignItems: 'center' },
  headerRight: { flexDirection: 'row', gap: 0 },
  levelLabel: {
    fontSize: 11,
    fontFamily: 'Inter_500Medium',
    color: c.laser,
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  levelName: { fontSize: 15, fontFamily: 'Inter_600SemiBold', color: c.foreground },
  banner: {
    backgroundColor: 'rgba(0,212,255,0.08)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,212,255,0.2)',
    paddingHorizontal: 14,
    paddingVertical: 10,
    gap: 6,
  },
  bannerContent: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  bannerText: { fontSize: 13, fontFamily: 'Inter_400Regular', color: c.foreground, flex: 1, lineHeight: 18 },
  bannerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  bannerBtn: { paddingVertical: 4 },
  bannerBtnText: { fontSize: 13, fontFamily: 'Inter_600SemiBold', color: c.laser },
  bannerClose: { padding: 4 },
  boardArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  hintLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    opacity: 0.8,
  },
  hintLabelText: {
    fontSize: 12,
    fontFamily: 'Inter_400Regular',
    color: c.laser,
  },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingTop: 4,
  },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendText: { fontSize: 11, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  legendDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: c.border },
  controls: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: 10,
    alignItems: 'center',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
  },
  mirrorCounter: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  counterText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: c.mutedForeground },
  controlsLabel: { fontSize: 12, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  mirrorPicker: { flexDirection: 'row', gap: 12 },
  mirrorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
    minWidth: 120,
  },
  mirrorBtnActive: {
    borderColor: c.laser,
    backgroundColor: 'rgba(0,212,255,0.07)',
  },
  mirrorPreviewWrap: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  mirrorPreviewLine: {
    width: 38,
    height: 3,
    backgroundColor: c.mirrorFixed,
    borderRadius: 2,
  },
  mirrorPreviewLineActive: { backgroundColor: c.mirror },
  mirrorSymbol: {
    fontSize: 22,
    fontFamily: 'Inter_600SemiBold',
    color: c.mutedForeground,
    lineHeight: 26,
  },
  mirrorSymbolActive: { color: c.laser },
  mirrorSubLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
  },
  hint: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
    opacity: 0.6,
    textAlign: 'center',
  },
  winOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(7,14,28,0.88)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  winCard: {
    backgroundColor: c.card,
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 6,
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
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: 'rgba(0,255,255,0.1)',
    borderWidth: 1.5,
    borderColor: 'rgba(0,255,255,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  winTitle: { fontSize: 26, fontFamily: 'Inter_700Bold', color: c.laser },
  winSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: c.mutedForeground, marginBottom: 10 },
  winButtons: { width: '100%', gap: 8 },
  winPrimaryBtn: {
    backgroundColor: c.laser,
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  winPrimaryText: { fontSize: 16, fontFamily: 'Inter_700Bold', color: '#000' },
  winSecondaryRow: { flexDirection: 'row', gap: 8 },
  winSecBtn: {
    backgroundColor: c.muted,
    borderRadius: 12,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderWidth: 1,
    borderColor: c.border,
  },
  winSecText: { fontSize: 13, fontFamily: 'Inter_500Medium', color: c.foreground },
});
