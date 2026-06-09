import { Feather } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Board from '@/components/Board';
import colors from '@/constants/colors';
import { useGame } from '@/context/GameContext';
import type { SelectedTool } from '@/types/game';

const c = colors.light;

function CoinBurst({ coins }: { coins: number }) {
  const translateY = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateY, { toValue: -32, duration: 1000, useNativeDriver: true }),
      Animated.sequence([
        Animated.delay(500),
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
      ]),
    ]).start();
  }, [opacity, translateY]);
  return (
    <Animated.View style={[styles.coinBurst, { transform: [{ translateY }], opacity }]}>
      <Text style={styles.coinBurstText}>+{coins} 🪙</Text>
    </Animated.View>
  );
}

function WinOverlay({ level, coinsEarned, onNext, onMenu, onRetry }: {
  level: number;
  coinsEarned: number | null;
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

        {coinsEarned !== null && (
          <View style={styles.coinRow}>
            <Text style={styles.coinEmoji}>🪙</Text>
            <Text style={styles.coinAmount}>+{coinsEarned} coin{coinsEarned !== 1 ? 's' : ''}</Text>
            {coinsEarned > 1 && (
              <View style={styles.underParBadge}>
                <Text style={styles.underParText}>Under par!</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.winButtons}>
          <TouchableOpacity style={styles.winPrimaryBtn} onPress={onNext} activeOpacity={0.8}>
            <Text style={styles.winPrimaryText}>Next Level</Text>
            <Feather name="chevron-right" size={18} color="#000" />
          </TouchableOpacity>
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

// ── Short-circuit / Combustion screen banner ────────────────────────────────
function ResetBanner({ animState }: { animState: 'short-circuit' | 'combustion' }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale   = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 150, useNativeDriver: true }),
      Animated.spring(scale,  { toValue: 1, useNativeDriver: true, tension: 90, friction: 8 }),
    ]).start();
  }, [opacity, scale]);

  const isShort = animState === 'short-circuit';
  const bgColor  = isShort ? 'rgba(0,212,255,0.12)' : 'rgba(255,80,0,0.12)';
  const border   = isShort ? 'rgba(0,212,255,0.4)' : 'rgba(255,100,0,0.4)';
  const textColor = isShort ? '#00d4ff' : '#ff6b00';
  const icon: keyof typeof Feather.glyphMap = isShort ? 'zap' : 'alert-circle';
  const title = isShort ? '⚡  Short Circuit!' : '💥  Combustion!';
  const sub   = isShort
    ? 'The beam crossed itself — puzzle reset'
    : 'The beam hit a forbidden zone — puzzle reset';

  return (
    <Animated.View style={[styles.resetBanner, { backgroundColor: bgColor, borderColor: border, opacity, transform: [{ scale }] }]}>
      <Feather name={icon} size={20} color={textColor} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.resetBannerTitle, { color: textColor }]}>{title}</Text>
        <Text style={styles.resetBannerSub}>{sub}</Text>
      </View>
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
          Place mirrors to redirect the laser through the gate to the bullseye.
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

interface ToolBtnProps {
  label: string;
  subLabel: string;
  icon: React.ReactNode;
  active: boolean;
  count?: number;
  disabled?: boolean;
  onPress: () => void;
}
function ToolBtn({ label, subLabel, icon, active, count, disabled, onPress }: ToolBtnProps) {
  return (
    <TouchableOpacity
      style={[
        styles.mirrorBtn,
        active && styles.mirrorBtnActive,
        disabled && styles.mirrorBtnDisabled,
      ]}
      onPress={onPress}
      activeOpacity={disabled ? 1 : 0.7}
      disabled={disabled}
    >
      <View style={styles.mirrorPreviewWrap}>{icon}</View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.mirrorSymbol, active && styles.mirrorSymbolActive]}>{label}</Text>
        <Text style={styles.mirrorSubLabel}>{subLabel}</Text>
      </View>
      {count !== undefined && (
        <View style={[styles.countBadge, active && styles.countBadgeActive]}>
          <Text style={[styles.countBadgeText, active && styles.countBadgeTextActive]}>{count}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

export default function GameScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { state, inventory, loadLevel, tapCell, fireBeam, setTool, undo, resetLevel } = useGame();
  const [showBanner, setShowBanner] = useState(true);

  const levelId = parseInt(id ?? '1', 10);
  const loadedLevelIdRef = useRef(-1);

  useEffect(() => {
    if (loadedLevelIdRef.current !== levelId) {
      loadedLevelIdRef.current = levelId;
      loadLevel(levelId);
    }
  }, [levelId, loadLevel]);

  const topPad = Platform.OS === 'web' ? 67 : insets.top;
  const botPad = Platform.OS === 'web' ? 34 : insets.bottom;

  const handleTap = useCallback((row: number, col: number) => {
    if (!state) return;
    // Ignore taps while animation is playing
    if (state.animState !== 'none') return;

    const cell = state.grid[row][col];
    const isBombOnAbsorber = state.selectedTool === 'bomb' && cell.kind === 'absorber';
    const isFiberTool = state.selectedTool === 'fiber';
    const isInteractive = isBombOnAbsorber || isFiberTool ||
      (!cell.fixed && cell.kind !== 'target' && cell.kind !== 'laser' && cell.kind !== 'wall' && cell.kind !== 'checkpoint');
    if (isInteractive) {
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

  const {
    level, grid, hitTargets, hitCheckpoints, isSolved,
    remainingMirrors, selectedTool, coinsJustEarned,
    beamFired, animState, fiberPhase, pendingFiberEntry,
  } = state;

  const isLevel1 = level.id === 1;
  const hintCell = isLevel1 && remainingMirrors === level.playerMirrors
    ? { row: 0, col: 3 }
    : null;

  const hasItems = inventory.splitter > 0 || inventory.bomb > 0 || inventory.fiber > 0;

  // Hint text at the bottom
  let hintText = 'Tap empty to place · Tap mirror to cycle → rotate → remove';
  if (selectedTool === 'bomb') {
    hintText = 'Tap an absorber (✕) to destroy it';
  } else if (selectedTool === 'splitter') {
    hintText = 'Tap an empty cell to place splitter · Tap placed splitter to retrieve';
  } else if (selectedTool === 'fiber') {
    if (fiberPhase === 'placing-exit') {
      hintText = 'Tap a second cell for the tunnel exit · Tap the entry cell to cancel';
    } else {
      hintText = 'Tap two cells to create an underground tunnel · Tap a placed tunnel to remove it';
    }
  }

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

      {/* Short-circuit / Combustion banner */}
      {animState !== 'none' && (
        <ResetBanner animState={animState} />
      )}

      {/* Fiber placement phase indicator */}
      {selectedTool === 'fiber' && fiberPhase === 'placing-exit' && animState === 'none' && (
        <View style={styles.fiberPhaseBanner}>
          <View style={styles.fiberPhaseStep}>
            <View style={[styles.fiberPhaseCircle, styles.fiberPhaseCircleDone]}>
              <Feather name="check" size={11} color="#000" />
            </View>
            <Text style={styles.fiberPhaseText}>Entry placed</Text>
          </View>
          <View style={styles.fiberPhaseDivider} />
          <View style={styles.fiberPhaseStep}>
            <View style={[styles.fiberPhaseCircle, styles.fiberPhaseCircleActive]}>
              <Text style={styles.fiberPhaseCircleText}>2</Text>
            </View>
            <Text style={[styles.fiberPhaseText, { color: '#f97316' }]}>Tap exit cell</Text>
          </View>
        </View>
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
          hitCheckpoints={hitCheckpoints}
          onTapCell={handleTap}
          hintCell={hintCell}
          pendingFiberEntry={pendingFiberEntry}
          beamFired={beamFired}
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
        {/* ── Fire Beam button ── */}
        <TouchableOpacity
          style={[styles.fireBtn, beamFired && styles.fireBtnFired, animState !== 'none' && styles.fireBtnDisabled]}
          onPress={() => {
            if (animState !== 'none') return;
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            fireBeam();
          }}
          activeOpacity={0.82}
          disabled={animState !== 'none'}
        >
          <Feather name="zap" size={18} color={beamFired ? '#7c3aed' : '#000'} />
          <Text style={[styles.fireBtnText, beamFired && styles.fireBtnTextFired]}>
            {beamFired ? 'Beam Active — modify to reset' : 'Fire Beam'}
          </Text>
        </TouchableOpacity>

        <View style={styles.controlsRow}>
          <View style={styles.mirrorCounter}>
            <Feather name="layers" size={13} color={c.mutedForeground} />
            <Text style={styles.counterText}>
              {remainingMirrors} mirror{remainingMirrors !== 1 ? 's' : ''} left
            </Text>
          </View>
          <Text style={styles.controlsLabel}>Select tool:</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mirrorPicker}>
          <ToolBtn
            label="/"
            subLabel="Slash"
            active={selectedTool === 'slash'}
            icon={
              <View style={[styles.mirrorPreviewLine, { transform: [{ rotate: '-45deg' }] }, selectedTool === 'slash' && styles.mirrorPreviewLineActive]} />
            }
            onPress={() => setTool('slash')}
          />
          <ToolBtn
            label="\"
            subLabel="Backslash"
            active={selectedTool === 'backslash'}
            icon={
              <View style={[styles.mirrorPreviewLine, { transform: [{ rotate: '45deg' }] }, selectedTool === 'backslash' && styles.mirrorPreviewLineActive]} />
            }
            onPress={() => setTool('backslash')}
          />
          <ToolBtn
            label="⋈"
            subLabel="Splitter"
            active={selectedTool === 'splitter'}
            count={inventory.splitter}
            disabled={inventory.splitter === 0}
            icon={<Text style={{ fontSize: 18, color: selectedTool === 'splitter' ? c.laser : c.mutedForeground }}>⋈</Text>}
            onPress={() => setTool('splitter')}
          />
          <ToolBtn
            label="💥"
            subLabel="Bomb"
            active={selectedTool === 'bomb'}
            count={inventory.bomb}
            disabled={inventory.bomb === 0}
            icon={<Text style={{ fontSize: 18 }}>💥</Text>}
            onPress={() => setTool('bomb')}
          />
          <ToolBtn
            label="〇"
            subLabel="Fiber"
            active={selectedTool === 'fiber'}
            count={inventory.fiber}
            disabled={inventory.fiber === 0 && fiberPhase === 'idle'}
            icon={
              <View style={{
                width: 22, height: 22,
                borderRadius: 11,
                borderWidth: 2.5,
                borderColor: selectedTool === 'fiber' ? '#f97316' : c.mutedForeground,
                alignItems: 'center', justifyContent: 'center',
              }}>
                <View style={{
                  width: 8, height: 8,
                  borderRadius: 4,
                  backgroundColor: selectedTool === 'fiber' ? '#f97316' : c.mutedForeground,
                }} />
              </View>
            }
            onPress={() => setTool('fiber')}
          />
        </ScrollView>

        {!hasItems && (
          <TouchableOpacity onPress={() => router.push('/shop')} style={styles.shopTeaser}>
            <Feather name="shopping-bag" size={12} color={c.laser} />
            <Text style={styles.shopTeaserText}>Visit the Shop to unlock Splitters, Bombs & Fiber Tunnels</Text>
          </TouchableOpacity>
        )}

        <Text style={styles.hint}>{hintText}</Text>
      </View>

      {isSolved && (
        <WinOverlay
          level={level.id}
          coinsEarned={coinsJustEarned}
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
  // Reset banner (short-circuit / combustion)
  resetBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 14,
    marginTop: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  resetBannerTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    lineHeight: 18,
  },
  resetBannerSub: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
    lineHeight: 15,
  },
  // Fiber phase indicator
  fiberPhaseBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 7,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(249,115,22,0.06)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(249,115,22,0.2)',
  },
  fiberPhaseStep: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  fiberPhaseCircle: {
    width: 20, height: 20, borderRadius: 10,
    alignItems: 'center', justifyContent: 'center',
  },
  fiberPhaseCircleDone: { backgroundColor: '#2ed573' },
  fiberPhaseCircleActive: { backgroundColor: '#f97316' },
  fiberPhaseCircleText: { fontSize: 11, fontFamily: 'Inter_700Bold', color: '#fff' },
  fiberPhaseDivider: { width: 24, height: 1.5, backgroundColor: 'rgba(249,115,22,0.3)' },
  fiberPhaseText: { fontSize: 12, fontFamily: 'Inter_500Medium', color: c.mutedForeground },
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
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: c.border,
    gap: 8,
    alignItems: 'center',
  },
  fireBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: c.laser,
  },
  fireBtnFired: {
    backgroundColor: 'rgba(124,58,237,0.12)',
    borderWidth: 1.5,
    borderColor: 'rgba(124,58,237,0.35)',
  },
  fireBtnDisabled: {
    opacity: 0.4,
  },
  fireBtnText: {
    fontSize: 15,
    fontFamily: 'Inter_700Bold',
    color: '#000',
  },
  fireBtnTextFired: {
    color: '#7c3aed',
    fontSize: 13,
    fontFamily: 'Inter_500Medium',
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
  mirrorPicker: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 2,
  },
  mirrorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
    backgroundColor: c.card,
    borderWidth: 1.5,
    borderColor: c.border,
    minWidth: 110,
  },
  mirrorBtnActive: {
    borderColor: c.laser,
    backgroundColor: 'rgba(0,212,255,0.07)',
  },
  mirrorBtnDisabled: {
    opacity: 0.38,
  },
  mirrorPreviewWrap: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
  mirrorPreviewLine: {
    width: 32,
    height: 3,
    backgroundColor: c.mirrorFixed,
    borderRadius: 2,
  },
  mirrorPreviewLineActive: { backgroundColor: c.mirror },
  mirrorSymbol: {
    fontSize: 20,
    fontFamily: 'Inter_600SemiBold',
    color: c.mutedForeground,
    lineHeight: 24,
  },
  mirrorSymbolActive: { color: c.laser },
  mirrorSubLabel: {
    fontSize: 10,
    fontFamily: 'Inter_400Regular',
    color: c.mutedForeground,
  },
  countBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: c.muted,
    borderWidth: 1,
    borderColor: c.border,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  countBadgeActive: {
    backgroundColor: 'rgba(0,212,255,0.15)',
    borderColor: c.laser,
  },
  countBadgeText: {
    fontSize: 11,
    fontFamily: 'Inter_600SemiBold',
    color: c.mutedForeground,
  },
  countBadgeTextActive: { color: c.laser },
  shopTeaser: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    opacity: 0.7,
  },
  shopTeaserText: {
    fontSize: 11,
    fontFamily: 'Inter_400Regular',
    color: c.laser,
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
  winSub: { fontSize: 13, fontFamily: 'Inter_400Regular', color: c.mutedForeground },
  coinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
    marginBottom: 6,
    backgroundColor: 'rgba(255,200,0,0.08)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,200,0,0.2)',
  },
  coinEmoji: { fontSize: 18 },
  coinAmount: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: '#FFD700',
  },
  underParBadge: {
    backgroundColor: 'rgba(255,200,0,0.18)',
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  underParText: {
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
    color: '#FFD700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  coinBurst: {
    position: 'absolute',
    top: '40%',
    alignSelf: 'center',
    zIndex: 10,
  },
  coinBurstText: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: '#FFD700',
  },
  winButtons: { width: '100%', gap: 8, marginTop: 4 },
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
