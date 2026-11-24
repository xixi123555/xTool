import {
  Bot,
  Braces,
  Calculator,
  FlaskConical,
  GitCompare,
  GraduationCap,
  Languages,
  LayoutGrid,
  ListChecks,
  MessageSquare,
  Settings,
  Sparkles,
  TrendingUp,
  Video,
  Wallet,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

export interface NavItem {
  path: string;
  label: string;
  icon: LucideIcon;
  guestAllowed?: boolean;
  mobileTab?: boolean;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: '工作台',
    items: [
      { path: '/bookkeeping', label: '记账', icon: Wallet, guestAllowed: true, mobileTab: true },
      { path: '/todo', label: '待办', icon: ListChecks, guestAllowed: true, mobileTab: true },
    ],
  },
  {
    label: '智能助手',
    items: [
      {
        path: '/ai/chat',
        label: '聊天室',
        icon: MessageSquare,
        guestAllowed: true,
        mobileTab: true,
      },
      { path: '/ai/knowledge', label: '知识库', icon: GraduationCap },
      { path: '/ai/orchestrator', label: '智能体编排', icon: Sparkles },
      { path: '/ai/code', label: '代码助手', icon: Bot, guestAllowed: true },
    ],
  },
  {
    label: '工具',
    items: [
      { path: '/tools', label: '全部工具', icon: LayoutGrid, guestAllowed: true, mobileTab: true },
      { path: '/tools/json', label: 'JSON 工具', icon: Braces, guestAllowed: true },
      { path: '/tools/diff', label: '文本对比', icon: GitCompare, guestAllowed: true },
      { path: '/tools/translate', label: '翻译', icon: Languages },
      { path: '/tools/reader', label: '网页阅读', icon: FlaskConical },
      { path: '/tools/video', label: '视频转 GIF', icon: Video, guestAllowed: true },
      { path: '/tools/stock', label: '股票', icon: TrendingUp, guestAllowed: true },
    ],
  },
];

export const SETTINGS_ITEM: NavItem = {
  path: '/settings',
  label: '设置',
  icon: Settings,
  guestAllowed: true,
  mobileTab: true,
};

export const MOBILE_TABS: NavItem[] = [
  ...NAV_GROUPS.flatMap((group) => group.items).filter((item) => item.mobileTab),
  SETTINGS_ITEM,
];

export const ALL_NAV_ITEMS: NavItem[] = [
  ...NAV_GROUPS.flatMap((group) => group.items),
  SETTINGS_ITEM,
];

/** 侧边栏/底部导航共用过滤逻辑：路人身份隐藏需要账号的能力 */
export function visibleNavItems(isGuestUser: boolean): NavGroup[] {
  return NAV_GROUPS.map((group) => ({
    ...group,
    items: group.items.filter((item) => !isGuestUser || item.guestAllowed),
  })).filter((group) => group.items.length > 0);
}

export const QUICK_TOOLS: NavItem[] = [
  { path: '/tools/json', label: 'JSON 工具', icon: Braces },
  { path: '/tools/diff', label: '文本对比', icon: GitCompare },
  { path: '/tools/translate', label: '翻译', icon: Languages },
  { path: '/tools/reader', label: '网页阅读', icon: FlaskConical },
  { path: '/tools/video', label: '视频转 GIF', icon: Video },
  { path: '/tools/stock', label: '股票', icon: TrendingUp },
  { path: '/bookkeeping', label: '记账', icon: Calculator },
];
