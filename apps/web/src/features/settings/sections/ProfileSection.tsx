import { Camera, Loader2, LogOut } from 'lucide-react';
import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { updateProfile } from '../../../shared/api/auth';
import { errorMessage } from '../../../shared/lib/http';
import { useAuthStore, isGuest } from '../../../shared/store/auth';
import { toast } from '../../../shared/store/feedback';
import { Avatar, Badge } from '../../../shared/ui/Controls';
import { SectionCard } from '../../../shared/ui/Page';

export function ProfileSection() {
  const user = useAuthStore((state) => state.user);
  const updateUser = useAuthStore((state) => state.updateUser);
  const logout = useAuthStore((state) => state.logout);
  const navigate = useNavigate();
  const [username, setUsername] = useState(user?.username ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [avatar, setAvatar] = useState(user?.avatar ?? '');
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!user) return null;

  const handleAvatar = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast('请选择图片文件', 'error');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast('图片不能超过 2MB', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result ?? ''));
    reader.onerror = () => toast('读取图片失败', 'error');
    reader.readAsDataURL(file);
    event.target.value = '';
  };

  const handleSave = async () => {
    if (!username.trim()) {
      toast('用户名不能为空', 'error');
      return;
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      toast('邮箱格式不正确', 'error');
      return;
    }
    setSaving(true);
    try {
      const result = await updateProfile({
        username: username.trim(),
        email: email.trim() || undefined,
        avatar: avatar || undefined,
      });
      if (!result.success || !result.user) throw new Error(result.error || '保存失败');
      updateUser(result.user);
      toast('个人信息已保存', 'success');
    } catch (error) {
      toast(errorMessage(error, '保存失败'), 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="space-y-3">
      <SectionCard title="个人信息" description="头像、用户名与邮箱会用于聊天室展示。">
        <div className="flex flex-wrap items-center gap-4">
          <button
            type="button"
            className="relative rounded-full"
            onClick={() => fileInputRef.current?.click()}
            aria-label="更换头像"
          >
            <Avatar src={avatar || undefined} name={username} size="lg" />
            <span className="absolute -bottom-0.5 -right-0.5 flex h-6 w-6 items-center justify-center rounded-full border-2 border-surface bg-accent text-accent-fg">
              <Camera className="h-3 w-3" />
            </span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatar}
          />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-fg">{user.username}</p>
              <Badge tone={isGuest(user) ? 'warning' : 'success'}>
                {isGuest(user) ? '路人' : '正式账号'}
              </Badge>
            </div>
            <p className="mt-0.5 text-xs text-subtle">点击头像更换，支持 JPG/PNG，最大 2MB。</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="profile-username">
              用户名
            </label>
            <input
              id="profile-username"
              className="field"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
            />
          </div>
          <div>
            <label className="label" htmlFor="profile-email">
              邮箱
            </label>
            <input
              id="profile-email"
              className="field"
              type="email"
              placeholder="可选"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            className="btn-primary"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            保存
          </button>
        </div>
      </SectionCard>

      <SectionCard title="账号">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-subtle">退出后需要重新登录，登录态有效期 7 天。</p>
          <button type="button" className="btn-secondary" onClick={handleLogout}>
            <LogOut className="h-4 w-4" />
            退出登录
          </button>
        </div>
      </SectionCard>
    </div>
  );
}
