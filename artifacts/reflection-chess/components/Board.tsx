import { Feather } from '@expo/vector-icons';
import React, { useMemo, useRef } from 'react';
import { Animated, Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Line, Svg } from 'react-native-svg';

import colors from '@/constants/colors';
import type { Direction, GameCell, LaserSegment, Side } from '@/types/game';
import { traceLaser } from '@/utils/laser';

const c = colors.light;

const SCREEN_W = Dimensions.get('window').width;
const BOARD_MAX = Math.min(SCREEN_W - 32, 380);
const BORDER = 1;

function getCellSize(gridSize: number) {
  return Math.floor((BOARD_MAX - BORDER * 2) / gridSize);
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
  const isStraight =
    (seg.from === 'left' && seg.to === 'right') ||
    (seg.from === 'right' && seg.to === 'left') ||
    (seg.from === 'top' && seg.to === 'bottom') ||
    (seg.from === 'bottom' && seg.to === 'top');
  if (isStraight) return [{ x1: fx, y1: fy, x2: tx, y2: ty }];
  return [
    { x1: fx, y1: fy, x2: cx, y2: cy },
    { x1: cx, y1: cy, x2: tx, y2: ty },
  ];
}

const ARROW_ICONS: Record<Direction, keyof typeof Feather.glyphMap> = {
  right: 'arrow-right',
  left:  'arrow-left',
  up:    'arrow-up',
  down:  'arrow-down',
};

function PulsingRing({ size, color }: { size: number; color: string }) {
  const scale = useRef(new Animated.Value(0.7)).current;
  const opacity = useRef(new Animated.Value(0.8)).current;

  React.useEffect(() => {
    Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(scale, { toValue: 1.4, duration: 1100, useNativeDriver: false }),
          Animated.timing(scale, { toValue: 0.7, duration: 1100, useNativeDriver: false }),
        ]),
        Animated.sequence([
          Animated.timing(opacity, { toValue: 0.05, duration: 1100, useNativeDriver: false }),
          Animated.timing(opacity, { toValue: 0.8, duration: 1100, useNativeDriver: false }),
        ]),
      ])
    ).start();
  }, [opacity, scale]);

  return (
    <Animated.View
      style={{
        position: 'absolute',
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: 2,
        borderColor: color,
        opacity,
        transform: [{ scale }],
      }}
    />
  );
}

interface Props {
  grid: GameCell[][];
  gridSize: number;
  hitTargets: Set<string>;
  hitCheckpoints: Set<string>;
  onTapCell: (row: number, col: number) => void;
  hintCell?: { row: number; col: number } | null;
}

export default function Board({ grid, gridSize, hitTargets, hitCheckpoints, onTapCell, hintCell }: Props) {
  const cs = getCellSize(gridSize);
  const boardSize = cs * gridSize + BORDER * 2;

  const { segments } = useMemo(() => traceLaser(grid, gridSize), [grid, gridSize]);

  const laserLines = useMemo<LaserLine[]>(() => {
    const lines: LaserLine[] = [];
    for (const seg of segments) {
      lines.push(...segmentToLines(seg, cs));
    }
    return lines;
  }, [segments, cs]);

  const pad = 3;
  const inner = cs - pad * 2;
  const iconSize    = Math.max(11, Math.floor(inner * 0.38));
  const arrowSize   = Math.max(9,  Math.floor(inner * 0.26));
  const mirrorLen   = inner * 1.28;
  const mirrorThick = Math.max(3, Math.floor(inner * 0.07));
  const ringSize    = Math.floor(inner * 0.62);
  const dotSize     = Math.max(4, Math.floor(inner * 0.24));

  const cells = grid.flatMap((row, r) =>
    row.map((cell, cc) => {
      const key = `${r},${cc}`;
      const hit         = hitTargets.has(key);
      const cpHit       = hitCheckpoints.has(key);
      const isHint      = hintCell?.row === r && hintCell?.col === cc;
      const isWall      = cell.kind === 'wall';
      const isSource    = cell.kind === 'laser';
      const isTarget    = cell.kind === 'target';
      const isMirror    = cell.kind === 'mirror-slash' || cell.kind === 'mirror-backslash';
      const isSplitter  = cell.kind === 'splitter';
      const isCheckpoint = cell.kind === 'checkpoint';
      const isAbsorber  = cell.kind === 'absorber';

      const mirrorColor = cell.fixed ? c.mirrorFixed : c.mirror;

      return (
        <TouchableOpacity
          key={key}
          onPress={() => onTapCell(r, cc)}
          activeOpacity={cell.fixed ? 1 : 0.65}
          style={{
            width: cs,
            height: cs,
            borderWidth: 0.5,
            borderColor: isHint ? 'rgba(0,212,255,0.4)' : c.cellBorder,
            backgroundColor: isWall
              ? c.wall
              : isAbsorber
              ? '#0a0a14'
              : isHint
              ? 'rgba(0,212,255,0.08)'
              : c.cellEmpty,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View style={{ width: inner, height: inner, alignItems: 'center', justifyContent: 'center' }}>

            {/* ── LASER SOURCE ── */}
            {isSource && (
              <View style={{
                width: inner, height: inner,
                backgroundColor: 'rgba(124,58,237,0.18)',
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                <Feather name="zap" size={iconSize} color={c.laser} />
                <View style={{ position: 'absolute', bottom: 2, right: 2 }}>
                  <Feather name={ARROW_ICONS[cell.direction ?? 'right']} size={arrowSize} color={c.laser} />
                </View>
              </View>
            )}

            {/* ── TARGET (bullseye) ── */}
            {isTarget && (
              <View style={{
                width: inner, height: inner,
                backgroundColor: hit ? 'rgba(46,213,115,0.15)' : 'rgba(255,71,87,0.12)',
                borderRadius: 4,
                alignItems: 'center',
                justifyContent: 'center',
              }}>
                {!hit && <PulsingRing size={ringSize * 1.3} color={c.target} />}
                <View style={{
                  width: ringSize, height: ringSize, borderRadius: ringSize,
                  borderWidth: 2.5,
                  borderColor: hit ? c.targetHit : c.target,
                  alignItems: 'center', justifyContent: 'center',
                }}>
                  <View style={{
                    width: dotSize, height: dotSize, borderRadius: dotSize,
                    backgroundColor: hit ? c.targetHit : c.target,
                  }} />
                </View>
                {hit && (
                  <Feather name="check" size={Math.floor(inner * 0.35)} color={c.targetHit}
                    style={{ position: 'absolute' }} />
                )}
              </View>
            )}

            {/* ── MIRROR ── */}
            {isMirror && (
              <View style={{
                width: inner, height: inner, alignItems: 'center', justifyContent: 'center',
              }}>
                <View style={{
                  width: mirrorLen, height: mirrorThick,
                  backgroundColor: mirrorColor, borderRadius: mirrorThick / 2,
                  transform: [{ rotate: cell.kind === 'mirror-slash' ? '-45deg' : '45deg' }],
                  shadowColor: mirrorColor, shadowOpacity: 0.7, shadowRadius: 5,
                  shadowOffset: { width: 0, height: 0 },
                }} />
                {!cell.fixed && (
                  <View style={{
                    position: 'absolute',
                    bottom: 2, right: 2,
                    width: 8, height: 8, borderRadius: 4,
                    backgroundColor: 'rgba(255,210,0,0.5)',
                  }} />
                )}
              </View>
            )}

            {/* ── SPLITTER ── */}
            {isSplitter && (
              <View style={{
                width: inner, height: inner,
                backgroundColor: 'rgba(139,92,246,0.18)',
                borderRadius: 4,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Main diagonal line */}
                <View style={{
                  width: mirrorLen, height: mirrorThick + 1,
                  backgroundColor: '#a78bfa', borderRadius: mirrorThick / 2,
                  transform: [{ rotate: '45deg' }],
                }} />
                {/* Cross line (horizontal) — centered absolutely */}
                <View style={{
                  position: 'absolute',
                  top: inner / 2 - Math.floor(mirrorThick * 0.6),
                  left: inner * 0.12,
                  right: inner * 0.12,
                  height: Math.ceil(mirrorThick * 1.1),
                  backgroundColor: '#a78bfa',
                  borderRadius: mirrorThick,
                  opacity: 0.85,
                }} />
                {/* Small indicator dot */}
                <View style={{
                  position: 'absolute',
                  top: 3, right: 3,
                  width: 5, height: 5, borderRadius: 3,
                  backgroundColor: '#c4b5fd',
                }} />
              </View>
            )}

            {/* ── CHECKPOINT (diamond) ── */}
            {isCheckpoint && (
              <View style={{
                width: inner, height: inner,
                backgroundColor: cpHit ? 'rgba(46,213,115,0.12)' : 'rgba(255,165,0,0.10)',
                borderRadius: 4,
                alignItems: 'center', justifyContent: 'center',
              }}>
                {/* Diamond shape via rotated square */}
                <View style={{
                  width: inner * 0.48,
                  height: inner * 0.48,
                  borderRadius: 4,
                  borderWidth: 2.5,
                  borderColor: cpHit ? c.targetHit : '#ffa500',
                  backgroundColor: cpHit ? 'rgba(46,213,115,0.25)' : 'rgba(255,165,0,0.15)',
                  transform: [{ rotate: '45deg' }],
                }}>
                  {/* Inner filled diamond when hit */}
                  {cpHit && (
                    <View style={{
                      position: 'absolute',
                      top: '25%', left: '25%',
                      width: '50%', height: '50%',
                      backgroundColor: c.targetHit,
                      borderRadius: 2,
                    }} />
                  )}
                </View>
                {/* "CP" label */}
                {!cpHit && (
                  <View style={{ position: 'absolute', bottom: 2 }}>
                    <Feather name="flag" size={Math.max(8, Math.floor(inner * 0.18))} color="#ffa500" />
                  </View>
                )}
                {cpHit && (
                  <Feather name="check" size={Math.floor(inner * 0.32)} color={c.targetHit}
                    style={{ position: 'absolute' }} />
                )}
              </View>
            )}

            {/* ── ABSORBER ── */}
            {isAbsorber && (
              <View style={{
                width: inner, height: inner,
                backgroundColor: '#06090f',
                borderRadius: 4,
                alignItems: 'center', justifyContent: 'center',
                borderWidth: 1,
                borderColor: '#1a2030',
              }}>
                {/* X pattern */}
                <View style={{
                  width: inner * 0.7, height: mirrorThick,
                  backgroundColor: '#2a3550',
                  borderRadius: mirrorThick,
                  transform: [{ rotate: '45deg' }],
                  position: 'absolute',
                }} />
                <View style={{
                  width: inner * 0.7, height: mirrorThick,
                  backgroundColor: '#2a3550',
                  borderRadius: mirrorThick,
                  transform: [{ rotate: '-45deg' }],
                  position: 'absolute',
                }} />
              </View>
            )}

            {/* ── WALL ── */}
            {isWall && (
              <View style={{
                width: inner, height: inner,
                backgroundColor: '#080f1a',
                borderRadius: 2,
              }} />
            )}

          </View>
        </TouchableOpacity>
      );
    })
  );

  return (
    <View style={[styles.board, { width: boardSize, height: boardSize }]}>
      {cells}

      <View style={[StyleSheet.absoluteFill, { pointerEvents: 'none' }]}>
        <Svg width={boardSize} height={boardSize}>
          {laserLines.map((ln, i) => (
            <React.Fragment key={i}>
              <Line
                x1={ln.x1 + BORDER} y1={ln.y1 + BORDER}
                x2={ln.x2 + BORDER} y2={ln.y2 + BORDER}
                stroke={c.laser} strokeWidth={12} strokeOpacity={0.1} strokeLinecap="round"
              />
              <Line
                x1={ln.x1 + BORDER} y1={ln.y1 + BORDER}
                x2={ln.x2 + BORDER} y2={ln.y2 + BORDER}
                stroke={c.laser} strokeWidth={4} strokeOpacity={0.42} strokeLinecap="round"
              />
              <Line
                x1={ln.x1 + BORDER} y1={ln.y1 + BORDER}
                x2={ln.x2 + BORDER} y2={ln.y2 + BORDER}
                stroke={c.laser} strokeWidth={2} strokeOpacity={0.9} strokeLinecap="round"
              />
            </React.Fragment>
          ))}
        </Svg>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  board: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    backgroundColor: c.card,
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: BORDER,
    borderColor: c.border,
  },
});
