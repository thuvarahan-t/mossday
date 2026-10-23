import {
  Archive, Bus, Calendar, Camera, Check, ChevronLeft, ChevronRight, CloudDownload,
  Coffee, Contrast, Coins, Database, Delete, Ellipsis, FileText, Film, Flame, Folder, GraduationCap, Heart,
  House, Image, LayoutGrid, ListChecks, Mic, Minus, Moon, Palette, Pause, Pencil, Pin, Play, Plus,
  ReceiptText, ScanFace, Search, Settings, Share, ShoppingBag, ShoppingCart, SquareCheck, Tag, Target,
  Trash2, Utensils, Wallet, X, type LucideIcon,
} from 'lucide-react-native';
import { memo } from 'react';
import { Platform } from 'react-native';
import type { ColorToken } from '@/constants/theme';
import { useTheme } from '@/hooks/useTheme';

/**
 * Curated icon set (Lucide: rounded caps/joins, SF-Symbols-like). Screens and the DB refer
 * to icons by these names only, so swapping the library later touches this file alone.
 */
const icons = {
  archive: Archive,
  backspace: Delete,
  bills: ReceiptText,
  bus: Bus,
  calendar: Calendar,
  camera: Camera,
  check: Check,
  checklist: ListChecks,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  close: X,
  coffee: Coffee,
  currency: Coins,
  appearance: Contrast,
  backup: CloudDownload,
  storage: Database,
  more: Ellipsis,
  education: GraduationCap,
  edit: Pencil,
  flame: Flame,
  folder: Folder,
  fun: Film,
  groceries: ShoppingCart,
  health: Heart,
  home: House,
  image: Image,
  lock: ScanFace,
  mic: Mic,
  minus: Minus,
  moon: Moon,
  note: FileText,
  palette: Palette,
  pause: Pause,
  pin: Pin,
  play: Play,
  plus: Plus,
  search: Search,
  settings: Settings,
  share: Share,
  shopping: ShoppingBag,
  tag: Tag,
  target: Target,
  todo: SquareCheck,
  trash: Trash2,
  utensils: Utensils,
  habits: LayoutGrid,
  wallet: Wallet,
} as const satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof icons;

export function isIconName(name: string): name is IconName {
  return name in icons;
}

export type IconProps = {
  name: IconName;
  size?: number;
  /** Semantic token; use `rawColor` only for data colours such as a category accent. */
  color?: ColorToken;
  rawColor?: string;
  strokeWidth?: number;
  /** Fill colour for "selected" glyphs (active tab icon), drawn under the stroke. */
  fill?: string;
};

export const Icon = memo(function Icon({ name, size, color = 'label', rawColor, strokeWidth = 2, fill }: IconProps) {
  const theme = useTheme();
  const Glyph = icons[name];
  return (
    <Glyph
      size={size ?? theme.sizes.icon}
      color={rawColor ?? theme.colors[color]}
      strokeWidth={strokeWidth}
      fill={fill ?? 'none'}
      accessible={Platform.OS === 'web' ? undefined : false}
      aria-hidden
    />
  );
});
