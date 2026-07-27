import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/context/ThemeContext';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/design-system/components/Tabs';
import { SettingsSection } from '@/components/Settings/SettingsSection';
import { useToast } from '@/components/Common/Toast';
import { LogOut, Moon, Sun, Camera, User } from 'lucide-react';

const NOTIF_KEY = 'nj_notif_prefs';

function loadNotifPrefs() {
  try {
    const raw = localStorage.getItem(NOTIF_KEY);
    if (raw) return JSON.parse(raw) as Record<string, boolean>;
  } catch { /* ignore */ }
  return {};
}

function saveNotifPrefs(prefs: Record<string, boolean>) {
  localStorage.setItem(NOTIF_KEY, JSON.stringify(prefs));
}

type Tab = 'profile' | 'preferences' | 'notifications';

export function SettingsPage() {
  const { t, i18n } = useTranslation();
  const { user, logout, updateProfile } = useAuth();
  const { theme, toggle } = useTheme();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Profile
  const [displayName, setDisplayName] = useState(user?.name || user?.username || '');
  const [profilePhoto, setProfilePhoto] = useState<string | null>(null);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string | null>(user?.profile_picture || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Notifications — load from localStorage
  const saved = loadNotifPrefs();
  const [notifWarnings, setNotifWarnings] = useState(saved.warnings ?? true);
  const [notifForecast, setNotifForecast] = useState(saved.forecast ?? true);
  const [notifPatrol, setNotifPatrol] = useState(saved.patrol ?? true);
  const [notifSystem, setNotifSystem] = useState(saved.system ?? true);

  // Profile photo URL is already initialized from user?.profile_picture above.
  // No backend call needed — the auth store persists it across sessions.

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user?.username) return;

    // Validate type
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      toast('error', 'Please upload a JPG, PNG, or WEBP image.');
      return;
    }

    // Validate size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast('error', 'Image must be under 5MB.');
      return;
    }

    setUploading(true);

    // Try backend upload; fall back to local data URL on any failure
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('username', user.username);
      const res = await fetch('/api/profile-pictures/upload', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        if (data?.profile_picture_url) {
          setProfilePhotoUrl(data.profile_picture_url);
          setProfilePhoto(data.profile_picture_url);
          updateProfile({ profile_picture: data.profile_picture_url });
          setUploading(false);
          toast('success', 'Profile photo uploaded successfully!');
          return;
        }
      }
    } catch {
      // backend unavailable — fall through to local fallback
    }

    // Demo/local fallback: read as data URL
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setProfilePhoto(dataUrl);
      setProfilePhotoUrl(dataUrl);
      updateProfile({ profile_picture: dataUrl });
      setUploading(false);
      toast('success', 'Profile photo updated (local).');
    };
    reader.onerror = () => {
      setUploading(false);
      toast('error', 'Failed to read file.');
    };
    reader.readAsDataURL(file);
  };

  const handleRemovePhoto = async () => {
    if (!user?.username) return;
    
    try {
      const res = await fetch(`/api/profile-pictures/${user.username}`, { method: 'DELETE' });
      if (res.ok) {
        setProfilePhotoUrl(null);
        setProfilePhoto(null);
        updateProfile({ profile_picture: null });
        toast('success', 'Profile photo removed successfully!');
        return;
      }
    } catch {
      // backend unavailable — clear locally
    }

    // Local fallback: just clear the state
    setProfilePhotoUrl(null);
    setProfilePhoto(null);
    updateProfile({ profile_picture: null });
    toast('success', 'Profile photo removed.');
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await new Promise(r => setTimeout(r, 300)); // brief delay for UX
      updateProfile({ name: displayName });
      toast('success', 'Profile updated successfully.');
    } catch {
      toast('error', 'Failed to save profile.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-lg font-semibold text-text-primary">{t('settings.title', 'Settings')}</h1>
        <p className="text-sm text-text-tertiary mt-1">{t('settings.description', 'Manage your profile and preferences')}</p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as Tab)}>
        <TabsList variant="enclosed">
          <TabsTrigger value="profile">{t('settings.profile', 'Profile')}</TabsTrigger>
          <TabsTrigger value="preferences">{t('settings.preferences', 'Preferences')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('settings.notifications', 'Notifications')}</TabsTrigger>
        </TabsList>

        {/* ── Profile Tab ──────────────────────────────────────── */}
        <TabsContent value="profile" className="space-y-6 mt-6">
          <SettingsSection title={t('settings.profilePhoto', 'Profile Photo')}>
            <div className="flex items-center gap-6">
              <div className="relative">
                <div className="w-20 h-20 rounded-full bg-bg-tertiary border-2 border-border-secondary flex items-center justify-center overflow-hidden">
                  {profilePhotoUrl ? (
                    <img src={profilePhotoUrl} alt="Profile" className="w-full h-full object-cover" />
                  ) : profilePhoto ? (
                    <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-text-tertiary" />
                  )}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-xs px-3 py-1.5 rounded-lg bg-service-blue/10 text-service-blue border border-service-blue/20 hover:bg-service-blue/20 transition-colors inline-flex items-center gap-1.5 disabled:opacity-50"
                >
                  {uploading ? (
                    <span className="text-xs">Uploading...</span>
                  ) : (
                    <>
                      <Camera className="w-3.5 h-3.5" />
                      {t('settings.uploadPhoto', 'Upload Photo')}
                    </>
                  )}
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
                {(profilePhotoUrl || profilePhoto) && (
                  <button
                    onClick={handleRemovePhoto}
                    disabled={uploading}
                    className="text-xs text-alert-red hover:underline disabled:opacity-50"
                  >
                    {uploading ? t('settings.removing', 'Removing...') : t('settings.removePhoto', 'Remove Photo')}
                  </button>
                )}
                <p className="text-[10px] text-text-tertiary">{t('settings.photoFormat', 'JPG, PNG, or WEBP. Max 5MB.')}</p>
              </div>
            </div>
          </SettingsSection>

          <SettingsSection title={t('settings.displayName', 'Display Name')}>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">{t('settings.displayName', 'Display Name')}</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input w-full"
                placeholder={t('settings.displayNamePlaceholder', 'Your display name')}
              />
            </div>
            <div className="mt-2">
              <label className="block text-xs font-medium text-text-secondary mb-1">{t('settings.role', 'Role')}</label>
              <input
                type="text"
                value={user?.roles?.[0] || 'Officer'}
                disabled
                className="input w-full opacity-60 cursor-not-allowed"
              />
              <p className="text-[10px] text-text-tertiary mt-1">{t('settings.roleDescription', 'Role is assigned by your administrator.')}</p>
            </div>
            <button
              onClick={handleSaveProfile}
              disabled={saving}
              className="mt-4 text-xs px-4 py-1.5 rounded-lg bg-service-blue text-white hover:bg-service-blue/90 transition-colors disabled:opacity-50"
            >
              {saving ? t('settings.saving', 'Saving...') : t('settings.saveProfile', 'Save Profile')}
            </button>
          </SettingsSection>
        </TabsContent>

        {/* ── Preferences Tab ───────────────────────────────────── */}
        <TabsContent value="preferences" className="space-y-6 mt-6">
          <SettingsSection title={t('settings.language', 'Language')}>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">{t('settings.displayLanguage', 'Display Language')}</label>
              <select
                value={i18n.language?.startsWith('kn') ? 'kn' : 'en'}
                onChange={(e) => i18n.changeLanguage(e.target.value)}
                className="input"
              >
                <option value="en">{t('language.en', 'English')}</option>
                <option value="kn">{t('language.kn', 'ಕನ್ನಡ')}</option>
              </select>
            </div>
          </SettingsSection>

          <SettingsSection title={t('settings.theme', 'Theme')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-text-primary">{t('settings.appearance', 'Appearance')}</p>
                <p className="text-xs text-text-tertiary">{t('settings.currentTheme', 'Current: {{theme}}', { theme: theme === 'dark' ? t('settings.darkMode', 'Dark Mode') : t('settings.lightMode', 'Light Mode') })}</p>
              </div>
              <button
                onClick={toggle}
                className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-lg border border-border-secondary hover:bg-bg-tertiary transition-colors"
              >
                {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                {theme === 'dark' ? t('settings.switchToLight', 'Switch to Light') : t('settings.switchToDark', 'Switch to Dark')}
              </button>
            </div>
          </SettingsSection>

          <SettingsSection title={t('settings.timezone', 'Timezone')}>
            <div>
              <select className="input" defaultValue="Asia/Kolkata">
                <option value="Asia/Kolkata">{t('settings.timezoneIST', 'India Standard Time (IST)')}</option>
                <option value="UTC">{t('settings.timezoneUTC', 'Coordinated Universal Time (UTC)')}</option>
              </select>
            </div>
          </SettingsSection>
        </TabsContent>

        {/* ── Notifications Tab ──────────────────────────────────── */}
        <TabsContent value="notifications" className="space-y-6 mt-6">
          <SettingsSection title={t('settings.notificationPreferences', 'Notification Preferences')}>
            {([
              { key: 'warnings', label: t('settings.warnings', 'Early Warnings'), checked: notifWarnings, set: setNotifWarnings },
              { key: 'forecast', label: t('settings.forecastUpdates', 'Forecast Updates'), checked: notifForecast, set: setNotifForecast },
              { key: 'patrol', label: t('settings.patrolRecommendations', 'Patrol Recommendations'), checked: notifPatrol, set: setNotifPatrol },
              { key: 'system', label: t('settings.systemAnnouncements', 'System Announcements'), checked: notifSystem, set: setNotifSystem },
            ] as const).map((item) => (
              <label key={item.key} className="flex items-center justify-between py-2">
                <span className="text-sm text-text-primary">{item.label}</span>
                <div className="relative inline-flex h-6 w-11 items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={(e) => {
                      item.set(e.target.checked);
                      // Persist to localStorage immediately
                      const updated = { ...loadNotifPrefs(), [item.key]: e.target.checked };
                      saveNotifPrefs(updated);
                    }}
                    className="peer sr-only"
                  />
                  <span className="absolute inset-0 rounded-full bg-border-primary transition-colors peer-checked:bg-service-blue/20 peer-focus-visible:outline-none peer-focus-visible:ring-2 peer-focus-visible:ring-service-blue/40" />
                  <span className="absolute left-0.5 h-5 w-5 rounded-full bg-text-primary transition-transform peer-checked:translate-x-5" />
                </div>
              </label>
            ))}
          </SettingsSection>
        </TabsContent>
      </Tabs>

      {/* ── Session Section (always visible) ──────────────────────── */}
      <div className="mt-8 pt-6 border-t border-border-secondary">
        <SettingsSection title={t('settings.session', 'Session')}>
          <button
            onClick={logout}
            className="flex items-center gap-2 text-xs px-4 py-2 rounded-lg border border-alert-red/20 text-alert-red hover:bg-alert-red/10 transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {t('settings.logout', 'Logout')}
          </button>
        </SettingsSection>
      </div>
    </div>
  );
}