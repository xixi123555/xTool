import { useState, useRef, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { showToast } from '../../components/toast/Toast';
import { updateProfile } from '../../api/auth';

export function ProfilePanel() {
  const { user, setUser } = useAppStore();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [username, setUsername] = useState(user?.username || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatar, setAvatar] = useState(user?.avatar || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 使用 useEffect 同步用户信息到表单
  useEffect(() => {
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || '');
    }
  }, [user]);

  const handleEdit = () => {
    setIsEditing(true);
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || '');
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    if (user) {
      setUsername(user.username || '');
      setEmail(user.email || '');
      setAvatar(user.avatar || '');
    }
  };

  const handleAvatarClick = () => {
    if (isEditing && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件');
      return;
    }

    // 检查文件大小（限制为 2MB）
    if (file.size > 2 * 1024 * 1024) {
      showToast('图片大小不能超过 2MB');
      return;
    }

    // 读取文件并转换为 base64
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setAvatar(result);
    };
    reader.onerror = () => {
      showToast('读取图片失败');
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    if (!user) return;

    if (!username.trim()) {
      showToast('用户名不能为空');
      return;
    }

    // 验证邮箱格式
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('邮箱格式不正确');
      return;
    }

    setLoading(true);
    try {
      const response = await updateProfile({
        username: username.trim(),
        email: email.trim() || undefined,
        avatar: avatar || undefined,
      });

      if (response.success && response.user) {
        setUser(response.user);
        localStorage.setItem('xtool_user', JSON.stringify(response.user));
        setIsEditing(false);
        showToast('个人信息更新成功');
      } else {
        showToast(response.error || '更新失败');
      }
    } catch (error: any) {
      console.error('更新个人信息错误:', error);
      showToast(error.response?.data?.error || '更新失败');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col h-full overflow-hidden p-6">
      {/* 头部 */}
      <header className="mb-6 flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">个人信息</h3>
          <p className="text-sm text-slate-500">管理您的个人资料</p>
        </div>
        {!isEditing && (
          <button
            className="text-slate-500 hover:text-slate-700 transition p-2 rounded-lg hover:bg-slate-100"
            onClick={handleEdit}
            title="编辑"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
              />
            </svg>
          </button>
        )}
      </header>

      {/* 内容 */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl space-y-6">
          {/* 头像 */}
          <div className="flex items-center gap-6">
            <div className="relative">
              <div
                className={`w-24 h-24 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center overflow-hidden ${
                  isEditing ? 'cursor-pointer hover:opacity-80 transition' : ''
                }`}
                onClick={handleAvatarClick}
              >
                {avatar ? (
                  <img src={avatar} alt="头像" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-3xl text-slate-500">
                    {username.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              {isEditing && (
                <div className="absolute bottom-0 right-0 w-8 h-8 bg-slate-900 rounded-full flex items-center justify-center border-2 border-white">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleAvatarChange}
              />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">头像</p>
              {isEditing && (
                <p className="text-xs text-slate-500 mt-1">点击头像可更换，支持 JPG、PNG 格式，最大 2MB</p>
              )}
            </div>
          </div>

          {/* 用户名 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">用户名</label>
            {isEditing ? (
              <input
                type="text"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="请输入用户名"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave();
                  }
                }}
              />
            ) : (
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {username || '未设置'}
              </div>
            )}
          </div>

          {/* 邮箱 */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">邮箱</label>
            {isEditing ? (
              <input
                type="email"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
                placeholder="请输入邮箱（可选）"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave();
                  }
                }}
              />
            ) : (
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                {email || '未设置'}
              </div>
            )}
          </div>

          {/* 操作按钮 */}
          {isEditing && (
            <div className="flex gap-3 pt-4">
              <button
                className="btn-primary flex-1"
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? '保存中...' : '保存'}
              </button>
              <button
                className="btn-secondary"
                onClick={handleCancel}
                disabled={loading}
              >
                取消
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

