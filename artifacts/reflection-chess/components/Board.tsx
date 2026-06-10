import { Feather } from '@expo/vector-icons';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Dimensions, Easing, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Line, Svg } from 'react-native-svg';

import colors from '@/constants/colors';
import { useCosmetics } from '@/context/CosmeticsContext';
import type { Direction, GameCell, LaserSegment, Side } from '@/types/game';

const c = colors.light;

const SCREEN_W = Dimensions.get('window').width;
const BOARD_MAX = Math.min(SCREEN_W - 32, 380);
const BORDER = 1;

function getCellSize(gridSize: number) {
  return Math.floor((BOARD_MAX - BORDER * 2) / gridSize);
}

const FIBER_COLORS = ['#f97316', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];
function fiberColor(id: number | undefined) {
  return id === undefined ? '#6b7280' : FIBER_COLORS[id % FIBER_COLORS.length];
}

function sidePoint(side: Side, row: number, col: number, cs: number): [number, number] {
  const cx = col * cs + cs / 2;
  const cy = row * cs + cs / 2;
  switch (side) {
    case 'left':   return [col * cs, cy];
    case 'right':  return [(col + 1) * cs, cy];
    case 'top':    return [cx, row * cs];
    case 'bottom': return [cx, (row + 1) * cs];
  }
}

interface LaserLine { x1: number; y1: number; x2: number; y2: number }

function segmentToLines(seg: LaserSegment, cs: number): LaserLine[] {
  const cx = seg.col * cs + cs / 2;
  const cy = seg.row * cs + cs / 2;
  const [fx, fy] = sidePoint(seg.from, seg.row, seg.col, cs);
  const [tx, ty] = sidePoint(seg.to, seg.row, seg.col, cs);
  const straight =
    (seg.from === 'left'  && seg.to === 'right') ||
    (seg.from === 'right' && seg.to === 'left')  ||
    (seg.from === 'top'   && seg.to === 'bottom') ||
    (seg.from === 'bottom'&& seg.to === 'top');
  if (straight) return [{ x1: fx, y1: fy, x2: tx, y2: ty }];
  return [
    { x1: fx, y1: fy, x2: cx, y2: cy },
    { x1: cx, y1: cy, x2: tx, y2: ty },
  ];
}

const ARROW_ICONS: Record<Direction, keyof typeof Feather.glyphMap> = {
  right: 'arrow-right', left: 'arrow-left', up: 'arrow-up', down: 'arrow-down',
};

// ── Animated helpers ──────────────────────────────────────────────────────────

function PulsingRing({ size, color }: { size: number; color: string }) {
  const scale   = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;
  useEffect(() => {
    Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(scale,   { toValue: 1.4,  duration: 1100, useNativeDriver: false }),
        Animated.timing(scale,   { toValue: 0.7,  duration: 1100, useNativeDriver: false }),
      ]),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.05, duration: 1100, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0.8,  duration: 1100, useNativeDriver: false }),
      ]),
    ])).start();
  }, [opacity, scale]);
  return (
    <Animated.View style={{
      position: 'absolute',
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 2, borderColor: color, opacity,
      transform: [{ scale }],
    }} />
  );
}

function PulsingCoinGlow({ size }: { size: number }) {
  const scale   = useRef(new Animated.Value(0.85)).current;
  const opacity = useRef(new Animated.Value(0.55)).current;
  useEffect(() => {
    Animated.loop(Animated.parallel([
      Animated.sequence([
        Animated.timing(scale,   { toValue: 1.25, duration: 950, useNativeDriver: false }),
        Animated.timing(scale,   { toValue: 0.85, duration: 950, useNativeDriver: false }),
      ]),
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.08, duration: 950, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0.55, duration: 950, useNativeDriver: false }),
      ]),
    ])).start();
  }, [opacity, scale]);
  return (
    <Animated.View style={{
      position: 'absolute',
      width: size, height: size, borderRadius: size / 2,
      borderWidth: 1.5, borderColor: '#FFD700',
      opacity, transform: [{ scale }],
    }} />
  );
}

// ── Enhanced ShortCircuitSpark: pulse ring + 4 zap arms ──────────────────────
function ShortCircuitSpark({ row, col, cs }: { row: number; col: number; cs: number }) {
  const scale    = useRef(new Animated.Value(0)).current;
  const opacity  = useRef(new Animated.Value(0)).current;
  const zapAnim  = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(scale,   { toValue: 1.8, duration: 220, useNativeDriver: false, easing: Easing.out(Easing.exp) }),
        Animated.timing(opacity, { toValue: 1,   duration: 120, useNativeDriver: false }),
      ]),
      Animated.parallel([
        Animated.timing(scale,   { toValue: 0.4, duration: 300, useNativeDriver: false }),
        Animated.timing(opacity, { toValue: 0,   duration: 300, useNativeDriver: false }),
      ]),
      Animated.delay(80),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(zapAnim, { toValue: 1, duration: 160, useNativeDriver: false }),
      Animated.delay(50),
      Animated.timing(zapAnim, { toValue: 0, duration: 110, useNativeDriver: false }),
      Animated.delay(200),
    ])).start();
  }, [opacity, scale, zapAnim]);

  const cx = col * cs + BORDER + cs / 2;
  const cy = row * cs + BORDER + cs / 2;
  const size   = cs * 0.82;
  const armLen = cs * 0.76;
  const zapOpacity = zapAnim.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 1, 0] });
  const armBase = { position: 'absolute' as const, borderRadius: 1.5, shadowOpacity: 0.9, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } };

  return (
    <>
      {/* Pulse ring */}
      <Animated.View style={{
        position: 'absolute',
        left: cx - size/2, top: cy - size/2,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: 'rgba(255,255,255,0.18)',
        borderWidth: 2.5, borderColor: '#00ffff',
        shadowColor: '#00ffff', shadowOpacity: 1, shadowRadius: 14, shadowOffset: { width: 0, height: 0 },
        opacity, transform: [{ scale }],
      }} />
      {/* H arm */}
      <Animated.View style={{ ...armBase, left: cx - armLen/2, top: cy - 1.5, width: armLen, height: 3, backgroundColor: '#00ffff', shadowColor: '#00ffff', opacity: zapOpacity }} />
      {/* V arm */}
      <Animated.View style={{ ...armBase, left: cx - 1.5, top: cy - armLen/2, width: 3, height: armLen, backgroundColor: '#00ffff', shadowColor: '#00ffff', opacity: zapOpacity }} />
      {/* Diagonal 45° */}
      <Animated.View style={{ ...armBase, left: cx - armLen/2, top: cy - 1.5, width: armLen, height: 3, backgroundColor: '#7dd3fc', shadowColor: '#7dd3fc', opacity: zapOpacity, transform: [{ rotate: '45deg' }] }} />
      {/* Diagonal -45° */}
      <Animated.View style={{ ...armBase, left: cx - armLen/2, top: cy - 1.5, width: armLen, height: 3, backgroundColor: '#7dd3fc', shadowColor: '#7dd3fc', opacity: zapOpacity, transform: [{ rotate: '-45deg' }] }} />
    </>
  );
}

// ── Enhanced CombustionBurst: pulse ring + 8 spark particles ─────────────────
const BURST_ANGLES = [0, Math.PI/4, Math.PI/2, 3*Math.PI/4, Math.PI, 5*Math.PI/4, 3*Math.PI/2, 7*Math.PI/4];
const BURST_COLORS = ['#ff6b00','#ffd700','#ff4400','#ffaa00','#ff5500','#ffd700','#ff4400','#ff8800'];

function CombustionBurst({ row, col, cs }: { row: number; col: number; cs: number }) {
  const scale     = useRef(new Animated.Value(0.2)).current;
  const opacity   = useRef(new Animated.Value(0)).current;
  const sparkAnim = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([
      Animated.parallel([
        Animated.timing(scale, { toValue: 2.2, duration: 380, useNativeDriver: false, easing: Easing.out(Easing.quad) }),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 1, duration: 90,  useNativeDriver: false }),
          Animated.timing(opacity, { toValue: 0, duration: 290, useNativeDriver: false }),
        ]),
      ]),
      Animated.delay(150),
    ])).start();
    Animated.loop(Animated.sequence([
      Animated.timing(sparkAnim, { toValue: 1, duration: 420, useNativeDriver: false, easing: Easing.out(Easing.exp) }),
      Animated.timing(sparkAnim, { toValue: 0, duration: 80,  useNativeDriver: false }),
      Animated.delay(130),
    ])).start();
  }, [opacity, scale, sparkAnim]);

  const cx = col * cs + BORDER + cs / 2;
  const cy = row * cs + BORDER + cs / 2;
  const size       = cs * 0.75;
  const sparkDist  = cs * 0.52;
  const sparkOpacity = sparkAnim.interpolate({ inputRange: [0, 0.12, 0.68, 1], outputRange: [0, 1, 0.7, 0] });

  return (
    <>
      {/* Main burst ring */}
      <Animated.View style={{
        position: 'absolute',
        left: cx - size/2, top: cy - size/2,
        width: size, height: size, borderRadius: size / 2,
        backgroundColor: 'rgba(255,80,0,0.22)',
        borderWidth: 3, borderColor: '#ff6b00',
        shadowColor: '#ff4400', shadowOpacity: 1, shadowRadius: 18, shadowOffset: { width: 0, height: 0 },
        opacity, transform: [{ scale }],
      }} />
      {/* Spark particles */}
      {BURST_ANGLES.map((angle, i) => (
        <Animated.View key={i} style={{
          position: 'absolute',
          left: cx - 3.5, top: cy - 3.5,
          width: 7, height: 7, borderRadius: 3.5,
          backgroundColor: BURST_COLORS[i],
          opacity: sparkOpacity,
          shadowColor: BURST_COLORS[i], shadowOpacity: 0.9, shadowRadius: 4, shadowOffset: { width: 0, height: 0 },
          transform: [
            { translateX: sparkAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.cos(angle) * sparkDist] }) },
            { translateY: sparkAnim.interpolate({ inputRange: [0, 1], outputRange: [0, Math.sin(angle) * sparkDist] }) },
          ],
        }} />
      ))}
    </>
  );
}

// ── Animation timing ──────────────────────────────────────────────────────────
const BEAM_STEP_MS = 80;

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  grid: GameCell[][];
  gridSize: number;
  allSegments: LaserSegment[];
  beamFired: boolean;
  onTapCell: (row: number, col: number) => void;
  onBeamComplete?: () => void;
  animState?: 'none' | 'short-circuit' | 'combustion';
  animPos?: { row: number; col: number } | null;
  hintCell?: { row: number; col: number } | null;
  pendingFiberEntry?: { row: number; col: number } | null;
}

export default function Board({
  grid, gridSize, allSegments, beamFired, onTapCell, onBeamComplete,
  animState = 'none', animPos, hintCell, pendingFiberEntry,
}: Props) {
  const cs = getCellSize(gridSize);
  const boardSize = cs * gridSize + BORDER * 2;

  const { activeLaserColor, activeGridTheme } = useCosmetics();
  const theme = activeGridTheme;
  const laserColor = activeLaserColor.color;

  // ── Segment reveal animation ───────────────────────────────────────────────
  const [revealedCount, setRevealedCount] = useState(0);
  const onBeamCompleteRef = useRef(onBeamComplete);
  useEffect(() => { onBeamCompleteRef.current = onBeamComplete; }, [onBeamComplete]);

  useEffect(() => {
    if (!beamFired) { setRevealedCount(0); return; }
    const total = allSegments.length;
    setRevealedCount(0);
    if (total === 0) { onBeamCompleteRef.current?.(); return; }
    let count = 0;
    let timer: ReturnType<typeof setTimeout>;
    const step = () => {
      count++;
      setRevealedCount(count);
      if (count < total) { timer = setTimeout(step, BEAM_STEP_MS); }
      else { onBeamCompleteRef.current?.(); }
    };
    timer = setTimeout(step, BEAM_STEP_MS);
    return () => clearTimeout(timer);
  }, [beamFired, allSegments.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived beam state ─────────────────────────────────────────────────────
  const visibleSegments  = allSegments.slice(0, revealedCount);
  const isAnimationDone  = beamFired && revealedCount >= allSegments.length && allSegments.length > 0;

  const visibleHitTargets = useMemo(() => {
    const set = new Set<string>();
    for (const seg of visibleSegments) {
      if (grid[seg.row]?.[seg.col]?.kind === 'target') set.add(`${seg.row},${seg.col}`);
    }
    return set;
  }, [visibleSegments, grid]);

  const visibleHitCheckpoints = useMemo(() => {
    const set = new Set<string>();
    for (const seg of visibleSegments) {
      if (grid[seg.row]?.[seg.col]?.kind === 'checkpoint') set.add(`${seg.row},${seg.col}`);
    }
    return set;
  }, [visibleSegments, grid]);

  const visibleHitCoins = useMemo(() => {
    const set = new Set<string>();
    for (const seg of visibleSegments) {
      if (grid[seg.row]?.[seg.col]?.kind === 'coin') set.add(`${seg.row},${seg.col}`);
    }
    return set;
  }, [visibleSegments, grid]);

  const totalCheckpoints = useMemo(() => {
    let count = 0;
    for (const row of grid) for (const cell of row) if (cell.kind === 'checkpoint') count++;
    return count;
  }, [grid]);

  const beamColor =
    isAnimationDone && animState === 'short-circuit' ? '#ff4757' :
    isAnimationDone && animState === 'combustion'    ? '#ff6b00' :
    laserColor;

  const segmentLines = useMemo(() => {
    return visibleSegments.map((seg, segIdx) => ({
      lines: segmentToLines(seg, cs),
      isFront: segIdx === visibleSegments.length - 1,
    }));
  }, [visibleSegments, cs]);

  const fiberTunnels = useMemo(() => {
    return visibleSegments
      .filter(seg => seg.tunnelTo)
      .map(seg => {
        const exitCell = seg.tunnelTo!;
        const fc = fiberColor(grid[seg.row]?.[seg.col]?.fiberId);
        return {
          x1: seg.col * cs + cs / 2 + BORDER,
          y1: seg.row * cs + cs / 2 + BORDER,
          x2: exitCell.col * cs + cs / 2 + BORDER,
          y2: exitCell.row * cs + cs / 2 + BORDER,
          color: fc,
        };
      });
  }, [visibleSegments, cs, grid]);

  // ── Cell sizing ────────────────────────────────────────────────────────────
  const pad         = 3;
  const inner       = cs - pad * 2;
  const iconSize    = Math.max(11, Math.floor(inner * 0.38));
  const arrowSize   = Math.max(9,  Math.floor(inner * 0.26));
  const mirrorLen   = inner * 1.28;
  const mirrorThick = Math.max(3,  Math.floor(inner * 0.07));
  const ringSize    = Math.floor(inner * 0.62);
  const dotSize     = Math.max(4,  Math.floor(inner * 0.24));
  const fiberRing   = Math.floor(inner * 0.68);
  const fiberDot    = Math.floor(inner * 0.3);
  const armTick     = Math.max(5, Math.floor(inner * 0.20));

  // ── Cells ──────────────────────────────────────────────────────────────────
  const cells = grid.flatMap((row, r) =>
    row.map((cell, cc) => {
      const key     = `${r},${cc}`;
      const hit     = visibleHitTargets.has(key);
      const cpHit   = visibleHitCheckpoints.has(key);
      const coinHit = visibleHitCoins.has(key);
      const isHint  = hintCell?.row === r && hintCell?.col === cc;
      const isPend  = pendingFiberEntry?.row === r && pendingFiberEntry?.col === cc;
      const fc      = fiberColor(cell.fiberId);
      const mirrorColor = cell.fixed ? c.mirrorFixed : c.mirror;

      return (
        <TouchableOpacity
          key={key}
          onPress={() => onTapCell(r, cc)}
          activeOpacity={cell.fixed ? 1 : 0.65}
          style={{
            width: cs, height: cs,
            borderWidth: 0.5,
            borderColor: isHint ? 'rgba(0,212,255,0.4)' : isPend ? 'rgba(255,165,0,0.5)' : theme.cellBorder,
            backgroundColor:
              cell.kind === 'wall'     ? c.wall :
              cell.kind === 'absorber' ? '#0a0a14' :
              isHint ? 'rgba(0,212,255,0.08)' :
              isPend ? 'rgba(255,165,0,0.06)' :
              theme.cellEmpty,
            alignItems: 'center', justifyContent: 'center',
          }}
        >
          <View style={{ width: inner, height: inner, alignItems: 'center', justifyContent: 'center' }}>

            {/* LASER SOURCE */}
            {cell.kind === 'laser' && (
              <View style={{ width: inner, height: inner, backgroundColor: 'rgba(124,58,237,0.18)', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                <Feather name="zap" size={iconSize} color={laserColor} />
                <View style={{ position: 'absolute', bottom: 2, right: 2 }}>
                  <Feather name={ARROW_ICONS[cell.direction ?? 'right']} size={arrowSize} color={laserColor} />
                </View>
              </View>
            )}

            {/* TARGET — crosshair design (distinct from fiber/checkpoint rings) */}
            {cell.kind === 'target' && (
              <View style={{ width: inner, height: inner, backgroundColor: hit ? 'rgba(46,213,115,0.15)' : 'rgba(255,71,87,0.12)', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                {!hit && <PulsingRing size={ringSize * 1.3} color={c.target} />}
                {/* Four crosshair tick marks */}
                <View style={{ position: 'absolute', top: 4,    left: inner/2 - 1.5, width: 3, height: armTick, backgroundColor: hit ? c.targetHit : c.target, borderRadius: 1.5 }} />
                <View style={{ position: 'absolute', bottom: 4, left: inner/2 - 1.5, width: 3, height: armTick, backgroundColor: hit ? c.targetHit : c.target, borderRadius: 1.5 }} />
                <View style={{ position: 'absolute', left: 4,   top: inner/2 - 1.5,  width: armTick, height: 3, backgroundColor: hit ? c.targetHit : c.target, borderRadius: 1.5 }} />
                <View style={{ position: 'absolute', right: 4,  top: inner/2 - 1.5,  width: armTick, height: 3, backgroundColor: hit ? c.targetHit : c.target, borderRadius: 1.5 }} />
                {/* Center dot */}
                <View style={{ width: dotSize, height: dotSize, borderRadius: dotSize/2, backgroundColor: hit ? c.targetHit : c.target }} />
                {hit && <Feather name="check" size={Math.floor(inner * 0.35)} color={c.targetHit} style={{ position: 'absolute' }} />}
              </View>
            )}

            {/* MIRROR */}
            {(cell.kind === 'mirror-slash' || cell.kind === 'mirror-backslash') && (
              <View style={{ width: inner, height: inner, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: mirrorLen, height: mirrorThick, backgroundColor: mirrorColor, borderRadius: mirrorThick / 2, transform: [{ rotate: cell.kind === 'mirror-slash' ? '-45deg' : '45deg' }], shadowColor: mirrorColor, shadowOpacity: 0.7, shadowRadius: 5, shadowOffset: { width: 0, height: 0 } }} />
                {!cell.fixed && <View style={{ position: 'absolute', bottom: 2, right: 2, width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,210,0,0.5)' }} />}
              </View>
            )}

            {/* SPLITTER */}
            {cell.kind === 'splitter' && (
              <View style={{ width: inner, height: inner, backgroundColor: 'rgba(139,92,246,0.18)', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: mirrorLen, height: mirrorThick + 1, backgroundColor: '#a78bfa', borderRadius: mirrorThick / 2, transform: [{ rotate: '45deg' }] }} />
                <View style={{ position: 'absolute', top: inner / 2 - Math.floor(mirrorThick * 0.6), left: inner * 0.12, right: inner * 0.12, height: Math.ceil(mirrorThick * 1.1), backgroundColor: '#a78bfa', borderRadius: mirrorThick, opacity: 0.85 }} />
                <View style={{ position: 'absolute', top: 3, right: 3, width: 5, height: 5, borderRadius: 3, backgroundColor: '#c4b5fd' }} />
              </View>
            )}

            {/* CHECKPOINT */}
            {cell.kind === 'checkpoint' && (
              <View style={{ width: inner, height: inner, backgroundColor: cpHit ? 'rgba(46,213,115,0.12)' : 'rgba(255,165,0,0.10)', borderRadius: 4, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ width: inner * 0.48, height: inner * 0.48, borderRadius: 4, borderWidth: 2.5, borderColor: cpHit ? c.targetHit : '#ffa500', backgroundColor: cpHit ? 'rgba(46,213,115,0.25)' : 'rgba(255,165,0,0.15)', transform: [{ rotate: '45deg' }] }}>
                  {cpHit && <View style={{ position: 'absolute', top: '25%', left: '25%', width: '50%', height: '50%', backgroundColor: c.targetHit, borderRadius: 2 }} />}
                </View>
                {!cpHit && totalCheckpoints > 1 && (
                  <Text style={{ position: 'absolute', bottom: 1, fontSize: Math.max(8, Math.floor(inner * 0.20)), fontFamily: 'Inter_700Bold', color: '#ffa500' }}>
                    {cell.checkpointOrder ?? 1}
                  </Text>
                )}
                {!cpHit && totalCheckpoints === 1 && (
                  <View style={{ position: 'absolute', bottom: 2 }}>
                    <Feather name="flag" size={Math.max(8, Math.floor(inner * 0.18))} color="#ffa500" />
                  </View>
                )}
                {cpHit && <Feather name="check" size={Math.floor(inner * 0.32)} color={c.targetHit} style={{ position: 'absolute' }} />}
              </View>
            )}

            {/* ABSORBER */}
            {cell.kind === 'absorber' && (
              <View style={{ width: inner, height: inner, backgroundColor: '#06090f', borderRadius: 4, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#1a2030' }}>
                <View style={{ width: inner * 0.7, height: mirrorThick, backgroundColor: '#2a3550', borderRadius: mirrorThick, transform: [{ rotate: '45deg' }],  position: 'absolute' }} />
                <View style={{ width: inner * 0.7, height: mirrorThick, backgroundColor: '#2a3550', borderRadius: mirrorThick, transform: [{ rotate: '-45deg' }], position: 'absolute' }} />
              </View>
            )}

            {/* WALL */}
            {cell.kind === 'wall' && <View style={{ width: inner, height: inner, backgroundColor: '#080f1a', borderRadius: 2 }} />}

            {/* FIBER ENTRY */}
            {cell.kind === 'fiber-entry' && (
              <View style={{ width: inner, height: inner, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', width: fiberRing + 8, height: fiberRing + 8, borderRadius: (fiberRing + 8) / 2, borderWidth: 1, borderColor: fc, opacity: 0.25 }} />
                <View style={{ width: fiberRing, height: fiberRing, borderRadius: fiberRing / 2, borderWidth: 2.5, borderColor: fc, backgroundColor: `${fc}18`, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: fiberDot, height: fiberDot, borderRadius: fiberDot / 2, backgroundColor: fc, opacity: cell.fiberId === undefined ? 0.4 : 0.85 }} />
                </View>
                <View style={{ position: 'absolute', bottom: 1, right: 1, backgroundColor: `${fc}33`, borderRadius: 3, paddingHorizontal: 2 }}>
                  <Feather name="arrow-down-circle" size={Math.max(7, Math.floor(inner * 0.22))} color={fc} />
                </View>
              </View>
            )}

            {/* FIBER EXIT */}
            {cell.kind === 'fiber-exit' && (
              <View style={{ width: inner, height: inner, alignItems: 'center', justifyContent: 'center' }}>
                <View style={{ position: 'absolute', width: fiberRing + 8, height: fiberRing + 8, borderRadius: (fiberRing + 8) / 2, borderWidth: 1, borderColor: fc, opacity: 0.25 }} />
                <View style={{ width: fiberRing, height: fiberRing, borderRadius: fiberRing / 2, borderWidth: 2.5, borderColor: fc, borderStyle: 'dashed', backgroundColor: `${fc}10`, alignItems: 'center', justifyContent: 'center' }}>
                  <View style={{ width: fiberDot, height: fiberDot, borderRadius: fiberDot / 2, borderWidth: 1.5, borderColor: fc, backgroundColor: 'transparent' }} />
                </View>
                <View style={{ position: 'absolute', bottom: 1, right: 1, backgroundColor: `${fc}22`, borderRadius: 3, paddingHorizontal: 2 }}>
                  <Feather name="arrow-up-circle" size={Math.max(7, Math.floor(inner * 0.22))} color={fc} />
                </View>
              </View>
            )}

            {/* COIN — golden collectible with pulsing glow; fades when beam hits it */}
            {cell.kind === 'coin' && (
              <View style={{ width: inner, height: inner, alignItems: 'center', justifyContent: 'center', opacity: coinHit ? 0.22 : 1 }}>
                <PulsingCoinGlow size={inner * 0.92} />
                <View style={{
                  width: inner * 0.68, height: inner * 0.68,
                  borderRadius: inner * 0.34,
                  backgroundColor: 'rgba(255,215,0,0.10)',
                  borderWidth: 2.5, borderColor: '#FFD700',
                  alignItems: 'center', justifyContent: 'center',
                  shadowColor: '#FFD700', shadowOpacity: 0.55, shadowRadius: 7,
                  shadowOffset: { width: 0, height: 0 },
                }}>
                  <Text style={{ fontSize: Math.max(8, Math.floor(inner * 0.3)), color: '#FFD700', lineHeight: Math.max(11, Math.floor(inner * 0.36)) }}>✦</Text>
                </View>
                {(cell.coinValue ?? 1) > 1 && (
                  <View style={{ position: 'absolute', top: 1, right: 1, backgroundColor: 'rgba(0,0,0,0.6)', borderRadius: 4, paddingHorizontal: 2 }}>
                    <Text style={{ fontSize: Math.max(7, Math.floor(inner * 0.18)), color: '#FFD700', fontFamily: 'Inter_700Bold' }}>×{cell.coinValue}</Text>
                  </View>
                )}
              </View>
            )}

          </View>
        </TouchableOpacity>
      );
    })
  );

  return (
    <View style={[styles.board, { width: boardSize, height: boardSize, backgroundColor: theme.boardBg, borderColor: theme.cellBorder }]}>
      {cells}

      {/* ── Laser beam SVG ── */}
      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        <Svg width={boardSize} height={boardSize}>
          {fiberTunnels.map((t, i) => (
            <React.Fragment key={`fiber-${i}`}>
              <Line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.color} strokeWidth={12} strokeOpacity={0.18} strokeDasharray="8 10" strokeLinecap="round" />
              <Line x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke={t.color} strokeWidth={2.5} strokeOpacity={0.72} strokeDasharray="5 7"  strokeLinecap="round" />
            </React.Fragment>
          ))}
          {segmentLines.flatMap(({ lines, isFront }, segIdx) =>
            lines.map((ln, li) => (
              <React.Fragment key={`${segIdx}-${li}`}>
                <Line x1={ln.x1 + BORDER} y1={ln.y1 + BORDER} x2={ln.x2 + BORDER} y2={ln.y2 + BORDER} stroke={beamColor} strokeWidth={isFront ? 18 : 12} strokeOpacity={isFront ? 0.22 : 0.10} strokeLinecap="round" />
                <Line x1={ln.x1 + BORDER} y1={ln.y1 + BORDER} x2={ln.x2 + BORDER} y2={ln.y2 + BORDER} stroke={beamColor} strokeWidth={isFront ? 6 : 4}  strokeOpacity={isFront ? 0.72 : 0.42} strokeLinecap="round" />
                <Line x1={ln.x1 + BORDER} y1={ln.y1 + BORDER} x2={ln.x2 + BORDER} y2={ln.y2 + BORDER} stroke={isFront ? '#ffffff' : beamColor} strokeWidth={isFront ? 2.5 : 1.8} strokeOpacity={isFront ? 1 : 0.88} strokeLinecap="round" />
              </React.Fragment>
            ))
          )}
        </Svg>
      </View>

      {/* ── Short-circuit spark ── */}
      {animState === 'short-circuit' && animPos && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <ShortCircuitSpark row={animPos.row} col={animPos.col} cs={cs} />
        </View>
      )}

      {/* ── Combustion burst ── */}
      {animState === 'combustion' && animPos && (
        <View style={StyleSheet.absoluteFill} pointerEvents="none">
          <CombustionBurst row={animPos.row} col={animPos.col} cs={cs} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderWidth: BORDER,
    borderRadius: 4,
    overflow: 'hidden',
    alignSelf: 'center',
  },
});
