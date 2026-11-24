import {
  ArrowUpRight,
  Braces,
  FlaskConical,
  GitCompare,
  Languages,
  TrendingUp,
  Video,
} from 'lucide-react';
import { Link } from 'react-router-dom';

import { useAuthStore, isGuest } from '../../shared/store/auth';
import { Page, PageHeader } from '../../shared/ui/Page';

const TOOLS = [
  {
    path: '/tools/json',
    title: 'JSON 工具',
    description: '格式化、压缩与校验 JSON，错误定位到具体行。',
    icon: Braces,
    guestAllowed: true,
  },
  {
    path: '/tools/diff',
    title: '文本对比',
    description: '并排查看两段文本或 JSON 的差异。',
    icon: GitCompare,
    guestAllowed: true,
  },
  {
    path: '/tools/translate',
    title: '翻译',
    description: '中英文互译，结果流式输出。',
    icon: Languages,
    guestAllowed: false,
  },
  {
    path: '/tools/reader',
    title: '网页阅读',
    description: '输入网址，提取正文并总结。',
    icon: FlaskConical,
    guestAllowed: false,
  },
  {
    path: '/tools/video',
    title: '视频转 GIF',
    description: '上传 MP4 / MKV / MOV，生成可下载的 GIF。',
    icon: Video,
    guestAllowed: true,
  },
  {
    path: '/tools/stock',
    title: '股票',
    description: '查询分红方案与历史价格。',
    icon: TrendingUp,
    guestAllowed: true,
  },
];

export function ToolsPage() {
  const user = useAuthStore((state) => state.user);
  const guest = isGuest(user);
  const visibleTools = TOOLS.filter((tool) => !guest || tool.guestAllowed);

  return (
    <Page>
      <PageHeader title="工具" description="常用的小工具都放在这里，免安装、即开即用。" />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {visibleTools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link
              key={tool.path}
              to={tool.path}
              className="card group flex items-start gap-3 p-4 transition hover:-translate-y-0.5 hover:shadow-pop"
            >
              <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-accent-soft text-accent">
                <Icon className="h-5 w-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-sm font-semibold text-fg">
                  {tool.title}
                  <ArrowUpRight className="h-3.5 w-3.5 text-subtle opacity-0 transition group-hover:opacity-100" />
                </span>
                <span className="mt-1 block text-xs leading-5 text-subtle">{tool.description}</span>
              </span>
            </Link>
          );
        })}
      </div>
      {guest && <p className="mt-4 text-xs text-subtle">路人身份暂不能使用翻译与网页阅读。</p>}
    </Page>
  );
}
