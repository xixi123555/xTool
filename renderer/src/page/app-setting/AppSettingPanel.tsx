import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { getAppSetting, updateAppSetting } from '../../api/appSetting';
import { Switch } from '../../components/common/Switch';

export function AppSettingPanel() {
  const { appConfig, setAppConfig, user } = useAppStore();
  // useLocalData: true = 使用本地数据, false = 使用在线数据
  // useOnlineData: true = 使用在线数据, false = 使用本地数据
  // Switch 关闭（false）= 使用本地数据（useLocalData = true）
  // Switch 开启（true）= 使用在线数据（useLocalData = false）
  const [useLocalData, setUseLocalData] = useState(appConfig.use_local_data);
  const useOnlineData = !useLocalData; // Switch 的状态：开启 = 使用在线数据
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // 加载配置
  useEffect(() => {
    if (!user) return;

    const loadConfig = async () => {
      setLoading(true);
      try {
        const response = await getAppSetting();
        if (response.success && response.config) {
          setUseLocalData(response.config.use_local_data);
          setAppConfig(response.config);
        } else {
          // 如果获取失败，使用默认值
          setUseLocalData(true);
          setAppConfig({ use_local_data: true });
        }
      } catch (error) {
        console.error('加载应用配置失败:', error);
        setUseLocalData(true);
        setAppConfig({ use_local_data: true });
      } finally {
        setLoading(false);
      }
    };

    loadConfig();
  }, [user, setAppConfig]);

  // 保存配置
  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    setMessage(null);

    try {
      const response = await updateAppSetting({ use_local_data: useLocalData });
      if (response.success) {
        setAppConfig({ use_local_data: useLocalData });
        setMessage({ type: 'success', text: '配置保存成功' });
        setTimeout(() => setMessage(null), 3000);
      } else {
        setMessage({ type: 'error', text: response.error || '保存失败' });
      }
    } catch (error) {
      console.error('保存应用配置失败:', error);
      setMessage({ type: 'error', text: '保存失败，请稍后重试' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-slate-500">加载中...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full p-6">
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">应用配置</h3>
        <p className="text-sm text-slate-500">管理应用的各项配置选项</p>
      </div>

      <div className="flex-1 space-y-6">
        {/* 数据源配置 */}
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h4 className="text-base font-medium text-slate-900 mb-1">数据源设置</h4>
              <p className="text-sm text-slate-500 mb-4">
                选择使用本地数据还是在线数据。使用本地数据时，数据将存储在本地；使用在线数据时，数据将同步到服务器。
              </p>
              <Switch
                checked={useOnlineData}
                onChange={(checked) => {
                  // Switch 开启（true）= 使用在线数据（useLocalData = false）
                  // Switch 关闭（false）= 使用本地数据（useLocalData = true）
                  setUseLocalData(!checked);
                }}
                label="使用在线数据"
                description="开启后，数据将同步到服务器，可在多设备间共享"
              />
            </div>
          </div>
        </div>

        {/* 提示消息 */}
        {message && (
          <div
            className={`p-4 rounded-lg ${
              message.type === 'success'
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-red-50 text-red-800 border border-red-200'
            }`}
          >
            {message.text}
          </div>
        )}

        {/* 保存按钮 */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || useLocalData === appConfig.use_local_data}
            className={`px-6 py-2 rounded-lg font-medium transition ${
              saving || useLocalData === appConfig.use_local_data
                ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                : 'bg-slate-900 text-white hover:bg-slate-800'
            }`}
          >
            {saving ? '保存中...' : '保存配置'}
          </button>
        </div>
      </div>
    </div>
  );
}

