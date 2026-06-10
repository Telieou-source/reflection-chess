import AsyncStorage from '@react-native-async-storage/async-storage';
import { Audio } from 'expo-av';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { AppState } from 'react-native';

const STORAGE_KEY = '@reflection_chess_cosmetics';

export type GridTheme = 'space' | 'neon' | 'arcade' | 'crystal';
export type LaserColorId = 'cyan' | 'plasma' | 'solar' | 'venom' | 'rose';
export type MusicTrackId = 'silence' | 'cosmic_drift' | 'neon_pulse' | 'deep_focus';

export interface LaserColorDef {
  id: LaserColorId;
  name: string;
  color: string;
  glow: string;
  cost: number;
}

export interface GridThemeDef {
  id: GridTheme;
  name: string;
  description: string;
  background: string;
  cellEmpty: string;
  cellBorder: string;
  boardBg: string;
  cost: number;
}

export interface MusicTrackDef {
  id: MusicTrackId;
  name: string;
  description: string;
  url: string | null;
  cost: number;
}

export const LASER_COLORS: Record<LaserColorId, LaserColorDef> = {
  cyan:   { id: 'cyan',   name: 'Cyan',        color: '#00d4ff', glow: 'rgba(0,212,255,0.30)',   cost: 0  },
  plasma: { id: 'plasma', name: 'Plasma',       color: '#a855f7', glow: 'rgba(168,85,247,0.35)', cost: 15 },
  solar:  { id: 'solar',  name: 'Solar Flare',  color: '#fbbf24', glow: 'rgba(251,191,36,0.35)', cost: 15 },
  venom:  { id: 'venom',  name: 'Venom',        color: '#4ade80', glow: 'rgba(74,222,128,0.35)', cost: 20 },
  rose:   { id: 'rose',   name: 'Rose',         color: '#f472b6', glow: 'rgba(244,114,182,0.35)', cost: 20 },
};

export const GRID_THEMES: Record<GridTheme, GridThemeDef> = {
  space:   { id: 'space',   name: 'Deep Space',   description: 'Classic dark void',        background: '#070e1c', cellEmpty: '#0d1b2e', cellBorder: '#1a2a3e', boardBg: '#0a1525', cost: 0  },
  neon:    { id: 'neon',    name: 'Neon Grid',    description: 'Electric city nights',     background: '#060611', cellEmpty: '#0a0918', cellBorder: '#2a1a5e', boardBg: '#080920', cost: 18 },
  arcade:  { id: 'arcade',  name: 'Arcade',       description: 'Classic game room vibes',  background: '#0e0a04', cellEmpty: '#1a1206', cellBorder: '#3d2a08', boardBg: '#120e05', cost: 22 },
  crystal: { id: 'crystal', name: 'Crystal Cave', description: 'Cool glacial tones',       background: '#030d10', cellEmpty: '#061618', cellBorder: '#0e3a3e', boardBg: '#071418', cost: 25 },
};

// Music track URLs — royalty-free placeholders from soundhelix.com (free to use).
// Swap in your own ambient MP3 URLs for a production release.
export const MUSIC_TRACKS: Record<MusicTrackId, MusicTrackDef> = {
  silence:      { id: 'silence',      name: 'Silence',      description: 'No background music',          url: null,                                                                      cost: 0  },
  cosmic_drift: { id: 'cosmic_drift', name: 'Cosmic Drift', description: 'Ambient electronic soundscape', url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',          cost: 10 },
  neon_pulse:   { id: 'neon_pulse',   name: 'Neon Pulse',   description: 'Pulsing synthesizer loops',    url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',          cost: 12 },
  deep_focus:   { id: 'deep_focus',   name: 'Deep Focus',   description: 'Meditative ambient tones',     url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',          cost: 15 },
};

interface CosmeticsState {
  activeColor: LaserColorId;
  activeTheme: GridTheme;
  activeTrack: MusicTrackId;
  musicEnabled: boolean;
  unlockedColors: LaserColorId[];
  unlockedThemes: GridTheme[];
  unlockedTracks: MusicTrackId[];
}

const DEFAULT_STATE: CosmeticsState = {
  activeColor: 'cyan',
  activeTheme: 'space',
  activeTrack: 'silence',
  musicEnabled: true,
  unlockedColors: ['cyan'],
  unlockedThemes: ['space'],
  unlockedTracks: ['silence'],
};

interface CosmeticsContextType {
  cosmetics: CosmeticsState;
  activeLaserColor: LaserColorDef;
  activeGridTheme: GridThemeDef;
  activeMusicTrack: MusicTrackDef;
  isColorUnlocked: (id: LaserColorId) => boolean;
  isThemeUnlocked: (id: GridTheme) => boolean;
  isTrackUnlocked: (id: MusicTrackId) => boolean;
  setActiveColor: (id: LaserColorId) => void;
  setActiveTheme: (id: GridTheme) => void;
  setActiveTrack: (id: MusicTrackId) => void;
  toggleMusic: () => void;
  unlockCosmetic: (kind: 'color' | 'theme' | 'track', id: string) => void;
}

const CosmeticsContext = createContext<CosmeticsContextType | null>(null);

export function CosmeticsProvider({ children }: { children: React.ReactNode }) {
  const [cosmetics, setCosmetics] = useState<CosmeticsState>(DEFAULT_STATE);
  const initialized = useRef(false);
  const soundRef = useRef<Audio.Sound | null>(null);
  const cosmeticsRef = useRef(cosmetics);
  useEffect(() => { cosmeticsRef.current = cosmetics; }, [cosmetics]);

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    AsyncStorage.getItem(STORAGE_KEY).then(raw => {
      if (!raw) return;
      try {
        const saved = JSON.parse(raw) as Partial<CosmeticsState>;
        setCosmetics(prev => ({
          ...prev,
          activeColor:    saved.activeColor    ?? prev.activeColor,
          activeTheme:    saved.activeTheme    ?? prev.activeTheme,
          activeTrack:    saved.activeTrack    ?? prev.activeTrack,
          musicEnabled:   saved.musicEnabled   ?? prev.musicEnabled,
          unlockedColors: saved.unlockedColors ?? prev.unlockedColors,
          unlockedThemes: saved.unlockedThemes ?? prev.unlockedThemes,
          unlockedTracks: saved.unlockedTracks ?? prev.unlockedTracks,
        }));
      } catch {}
    });
  }, []);

  const save = useCallback((next: CosmeticsState) => {
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }, []);

  const loadAndPlay = useCallback(async (trackId: MusicTrackId, enabled: boolean) => {
    if (soundRef.current) {
      try { await soundRef.current.unloadAsync(); } catch {}
      soundRef.current = null;
    }
    if (!enabled || trackId === 'silence') return;
    const track = MUSIC_TRACKS[trackId];
    if (!track.url) return;
    try {
      await Audio.setAudioModeAsync({ playsInSilentModeIOS: true, staysActiveInBackground: false });
      const { sound } = await Audio.Sound.createAsync(
        { uri: track.url },
        { shouldPlay: true, isLooping: true, volume: 0.35 }
      );
      soundRef.current = sound;
    } catch { /* network or device audio unavailable */ }
  }, []);

  useEffect(() => {
    loadAndPlay(cosmetics.activeTrack, cosmetics.musicEnabled);
  }, [cosmetics.activeTrack, cosmetics.musicEnabled, loadAndPlay]);

  useEffect(() => {
    const sub = AppState.addEventListener('change', next => {
      if (next !== 'active') {
        soundRef.current?.pauseAsync().catch(() => {});
      } else if (cosmeticsRef.current.musicEnabled && cosmeticsRef.current.activeTrack !== 'silence') {
        soundRef.current?.playAsync().catch(() => {});
      }
    });
    return () => {
      sub.remove();
      soundRef.current?.unloadAsync().catch(() => {});
    };
  }, []);

  const setActiveColor = useCallback((id: LaserColorId) => {
    setCosmetics(prev => {
      if (!prev.unlockedColors.includes(id)) return prev;
      const next = { ...prev, activeColor: id };
      save(next);
      return next;
    });
  }, [save]);

  const setActiveTheme = useCallback((id: GridTheme) => {
    setCosmetics(prev => {
      if (!prev.unlockedThemes.includes(id)) return prev;
      const next = { ...prev, activeTheme: id };
      save(next);
      return next;
    });
  }, [save]);

  const setActiveTrack = useCallback((id: MusicTrackId) => {
    setCosmetics(prev => {
      if (!prev.unlockedTracks.includes(id)) return prev;
      const next = { ...prev, activeTrack: id };
      save(next);
      return next;
    });
  }, [save]);

  const toggleMusic = useCallback(() => {
    setCosmetics(prev => {
      const next = { ...prev, musicEnabled: !prev.musicEnabled };
      save(next);
      return next;
    });
  }, [save]);

  const unlockCosmetic = useCallback((kind: 'color' | 'theme' | 'track', id: string) => {
    setCosmetics(prev => {
      let next = { ...prev };
      if (kind === 'color' && !prev.unlockedColors.includes(id as LaserColorId)) {
        next = { ...next, unlockedColors: [...prev.unlockedColors, id as LaserColorId], activeColor: id as LaserColorId };
      } else if (kind === 'theme' && !prev.unlockedThemes.includes(id as GridTheme)) {
        next = { ...next, unlockedThemes: [...prev.unlockedThemes, id as GridTheme], activeTheme: id as GridTheme };
      } else if (kind === 'track' && !prev.unlockedTracks.includes(id as MusicTrackId)) {
        next = { ...next, unlockedTracks: [...prev.unlockedTracks, id as MusicTrackId], activeTrack: id as MusicTrackId };
      }
      save(next);
      return next;
    });
  }, [save]);

  const isColorUnlocked = useCallback((id: LaserColorId) => cosmetics.unlockedColors.includes(id), [cosmetics.unlockedColors]);
  const isThemeUnlocked = useCallback((id: GridTheme)    => cosmetics.unlockedThemes.includes(id), [cosmetics.unlockedThemes]);
  const isTrackUnlocked = useCallback((id: MusicTrackId) => cosmetics.unlockedTracks.includes(id), [cosmetics.unlockedTracks]);

  return (
    <CosmeticsContext.Provider value={{
      cosmetics,
      activeLaserColor: LASER_COLORS[cosmetics.activeColor],
      activeGridTheme:  GRID_THEMES[cosmetics.activeTheme],
      activeMusicTrack: MUSIC_TRACKS[cosmetics.activeTrack],
      isColorUnlocked, isThemeUnlocked, isTrackUnlocked,
      setActiveColor, setActiveTheme, setActiveTrack, toggleMusic, unlockCosmetic,
    }}>
      {children}
    </CosmeticsContext.Provider>
  );
}

export function useCosmetics() {
  const ctx = useContext(CosmeticsContext);
  if (!ctx) throw new Error('useCosmetics must be used within CosmeticsProvider');
  return ctx;
}
