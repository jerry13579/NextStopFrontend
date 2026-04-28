import { useRef, useState, useEffect } from 'react';
import { Bell, Calendar, Palette, Database, Info, Sparkles, LogOut, User, Upload, MapPin, Clock, Plus, Home, BookOpen, Search, X, Pencil, Trash2 } from 'lucide-react';
import { ClassEmojiCustomizer } from './EmojiCustomizer';
import { ColorThemeSelector } from './ColorThemeSelector';
import { CustomThemeCreator } from './CustomThemeCreator';
import { ColorTheme } from '../utils/colorThemes';
import { SmartNotifications } from './SmartNotifications';

interface Class {
  id: string;
  code: string;
  name: string;
  emoji?: string;
  location?: string;
  startTime?: Date;
  endTime?: Date;
  buildingCode?: string;
  isCourse?: boolean;
}

interface SpecialPlace {
  name: string;
  lat: number;
  lng: number;
}

interface LocationResult {
  id: string;
  name: string;
  address?: string;
  lat: number;
  lng: number;
}

interface BusRoute {
  id: string;
  routeNumber: string;
  eta: number;
  destinationWalkTime: number;
}

interface SectionForm {
  location: string;
  days: number[];
  startTime: string;
  endTime: string;
}
const EMPTY_SECTION: SectionForm = { location: '', days: [], startTime: '10:00', endTime: '11:00' };

interface SettingsSectionProps {
  schedule: Class[];
  onEmojiChange: (classId: string, emoji: string) => void;
  onReplaceClass?: (groupIds: string[], data: { code: string; name: string; sections: SectionForm[] }) => void;
  onDeleteClass?: (groupIds: string[]) => void;
  onOpenSemesterWrapped?: () => void;
  userEmail?: string | null;
  onLogout?: () => void;
  currentTheme?: string;
  onThemeChange?: (themeId: string) => void;
  customTheme?: ColorTheme | null;
  onCustomThemeUpdate?: (theme: ColorTheme) => void;
  onDeleteCustomTheme?: () => void;
  smartNotificationsEnabled?: boolean;
  capacityAlertsEnabled?: boolean;
  delayNotificationsEnabled?: boolean;
  onToggleSmartNotifications?: (enabled: boolean) => void;
  onToggleCapacityAlerts?: (enabled: boolean) => void;
  onToggleDelayNotifications?: (enabled: boolean) => void;
  onImportCalendar?: (file: File) => Promise<number>;
  onAddClass?: (data: { code: string; name: string; sections: SectionForm[] }) => void;
  onTestNotification?: () => void;
  onSaveMeetingTime?: (meetingIds: string[], startHHMM: string, endHHMM: string) => void;
  onExportData?: () => Promise<void>;
  onClearData?: () => Promise<void>;
  homeAddress?: SpecialPlace | null;
  studySpot?: SpecialPlace | null;
  onSetHomeAddress?: (place: SpecialPlace | null) => void;
  onSetStudySpot?: (place: SpecialPlace | null) => void;
  onSearchLocations?: (query: string) => Promise<LocationResult[]>;
  nextClassForAlerts?: Class | null;
  busesForAlerts?: BusRoute[];
  currentTime?: Date;
}

export function SettingsSection({
  schedule,
  onEmojiChange,
  onDeleteClass,
  onOpenSemesterWrapped,
  userEmail,
  onLogout,
  currentTheme = 'default',
  onThemeChange,
  customTheme,
  onCustomThemeUpdate,
  onDeleteCustomTheme,
  smartNotificationsEnabled = true,
  capacityAlertsEnabled = true,
  delayNotificationsEnabled = true,
  onToggleSmartNotifications,
  onToggleCapacityAlerts,
  onToggleDelayNotifications,
  onImportCalendar,
  onAddClass,
  onReplaceClass,
  onSaveMeetingTime,
  onTestNotification,
  onExportData,
  onClearData,
  homeAddress,
  studySpot,
  onSetHomeAddress,
  onSetStudySpot,
  onSearchLocations,
  nextClassForAlerts = null,
  busesForAlerts = [],
  currentTime = new Date()
}: SettingsSectionProps) {
  const [showCustomThemeCreator, setShowCustomThemeCreator] = useState(false);
  const [calendarImportStatus, setCalendarImportStatus] = useState<string | null>(null);
  const [dataActionStatus, setDataActionStatus] = useState<string | null>(null);
  const calendarFileInputRef = useRef<HTMLInputElement | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({ code: '', name: '', sections: [{ ...EMPTY_SECTION }] as SectionForm[] });

  // Home & study spot search state
  const [homeQuery, setHomeQuery] = useState('');
  const [homeResults, setHomeResults] = useState<LocationResult[]>([]);
  const [studyQuery, setStudyQuery] = useState('');
  const [studyResults, setStudyResults] = useState<LocationResult[]>([]);

  useEffect(() => {
    if (!homeQuery.trim()) { setHomeResults([]); return; }
    const t = window.setTimeout(async () => {
      try { setHomeResults(await (onSearchLocations?.(homeQuery) ?? Promise.resolve([]))); } catch { setHomeResults([]); }
    }, 350);
    return () => window.clearTimeout(t);
  }, [homeQuery, onSearchLocations]);

  useEffect(() => {
    if (!studyQuery.trim()) { setStudyResults([]); return; }
    const t = window.setTimeout(async () => {
      try { setStudyResults(await (onSearchLocations?.(studyQuery) ?? Promise.resolve([]))); } catch { setStudyResults([]); }
    }, 350);
    return () => window.clearTimeout(t);
  }, [studyQuery, onSearchLocations]);

  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ code: '', name: '', sections: [{ ...EMPTY_SECTION }] as SectionForm[] });

  // ── section helpers ──
  const updAddSec = (idx: number, u: Partial<SectionForm>) =>
    setAddForm(p => ({ ...p, sections: p.sections.map((s, i) => i === idx ? { ...s, ...u } : s) }));
  const togAddDay = (idx: number, day: number) =>
    setAddForm(p => ({ ...p, sections: p.sections.map((s, i) => i === idx ? { ...s, days: s.days.includes(day) ? s.days.filter(d => d !== day) : [...s.days, day] } : s) }));

  const updEditSec = (idx: number, u: Partial<SectionForm>) =>
    setEditForm(p => ({ ...p, sections: p.sections.map((s, i) => i === idx ? { ...s, ...u } : s) }));
  const togEditDay = (idx: number, day: number) =>
    setEditForm(p => ({ ...p, sections: p.sections.map((s, i) => i === idx ? { ...s, days: s.days.includes(day) ? s.days.filter(d => d !== day) : [...s.days, day] } : s) }));

  const handleAddClass = () => {
    if (!addForm.code.trim() || addForm.sections.some(s => !s.days.length || !s.location.trim())) return;
    onAddClass?.({ code: addForm.code, name: addForm.name, sections: addForm.sections });
    setShowAddForm(false);
    setAddForm({ code: '', name: '', sections: [{ ...EMPTY_SECTION }] });
  };

  const handleSaveEdit = (groupIds: string[]) => {
    if (!editForm.code.trim() || editForm.sections.some(s => !s.days.length || !s.location.trim())) return;
    onReplaceClass?.(groupIds, { code: editForm.code, name: editForm.name, sections: editForm.sections });
    setEditingGroupId(null);
  };

  const handleDeleteClass = (groupIds: string[]) => {
    const confirmed = window.confirm('Delete this class from your schedule?');
    if (!confirmed) return;
    onDeleteClass?.(groupIds);
    setEditingGroupId(null);
  };

  const DAY_OPTIONS: Array<[string, number]> = [['M', 1], ['Tu', 2], ['W', 3], ['Th', 4], ['F', 5], ['Sa', 6], ['Su', 0]];

  const formatCompactTime = (date?: Date) => {
    if (!date || Number.isNaN(date.getTime())) return '';
    const hours = date.getHours();
    const minutes = date.getMinutes();
    const hour12 = hours % 12 || 12;
    const suffix = hours >= 12 ? 'P' : 'A';
    return `${hour12}:${String(minutes).padStart(2, '0')}${suffix}`;
  };

  const dayCode = (date?: Date) => {
    if (!date || Number.isNaN(date.getTime())) return '';
    return ['Su', 'M', 'Tu', 'W', 'Th', 'F', 'Sa'][date.getDay()];
  };

  const formatTimeInput = (date?: Date): string => {
    if (!date || Number.isNaN(date.getTime())) return '08:00';
    return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
  };

  const courseGroups = schedule
    .filter((cls) => cls.isCourse !== false)
    .reduce<Record<string, Class[]>>((groups, cls) => {
      const key = `${cls.code || cls.name}`.trim().toLowerCase();
      groups[key] = [...(groups[key] || []), cls];
      return groups;
    }, {});

  const groupedClasses = Object.values(courseGroups).map((classes) => {
    const sorted = [...classes].sort((a, b) => (a.startTime?.getTime() || 0) - (b.startTime?.getTime() || 0));
    const first = sorted[0];
    const meetingGroups = sorted.reduce<Record<string, Class[]>>((meetings, cls) => {
      const key = `${formatCompactTime(cls.startTime)}-${formatCompactTime(cls.endTime)}|${cls.location || ''}`;
      meetings[key] = [...(meetings[key] || []), cls];
      return meetings;
    }, {});
    const meetingLines = Object.values(meetingGroups).map((meetingClasses) => {
      const orderedDays = ['M', 'Tu', 'W', 'Th', 'F', 'Sa', 'Su'];
      const days = [...new Set(meetingClasses.map((cls) => dayCode(cls.startTime)).filter(Boolean))]
        .sort((a, b) => orderedDays.indexOf(a) - orderedDays.indexOf(b))
        .join('');
      const representativeMeeting = meetingClasses[0];
      return {
        ids: meetingClasses.map((cls) => cls.id),
        dayText: days,
        startTime: representativeMeeting.startTime,
        endTime: representativeMeeting.endTime,
        location: representativeMeeting.location || '',
      };
    });
    return {
      id: first.id,
      ids: sorted.map((cls) => cls.id),
      code: first.code,
      name: first.name,
      emoji: first.emoji || '📚',
      location: first.location || '',
      meetingLines,
    };
  });

  const handleSaveCustomTheme = (theme: ColorTheme) => {
    if (onCustomThemeUpdate) {
      onCustomThemeUpdate(theme);
    }
    setShowCustomThemeCreator(false);
  };

  const handleCalendarFileChange = async (file: File | undefined) => {
    if (!file || !onImportCalendar) return;

    try {
      setCalendarImportStatus('Importing calendar...');
      const importedCount = await onImportCalendar(file);
      setCalendarImportStatus(
        importedCount > 0
          ? `Imported ${importedCount} calendar ${importedCount === 1 ? 'event' : 'events'}`
          : 'No class events found in that calendar'
      );
    } catch {
      setCalendarImportStatus('Could not import that calendar file');
    } finally {
      if (calendarFileInputRef.current) {
        calendarFileInputRef.current.value = '';
      }
    }
  };

  const handleExportData = async () => {
    if (!onExportData) return;
    try {
      setDataActionStatus('Preparing your export...');
      await onExportData();
      setDataActionStatus('Export started.');
    } catch {
      setDataActionStatus('Could not export data yet. Backend support is required.');
    }
  };

  const handleClearData = async () => {
    if (!onClearData) return;
    const confirmed = window.confirm('Clear your NextStop data? This resets preferences, saved places, and trip history.');
    if (!confirmed) return;
    try {
      setDataActionStatus('Clearing your data...');
      await onClearData();
      setDataActionStatus('Your app data was cleared.');
    } catch {
      setDataActionStatus('Could not clear data yet. Backend support is required.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)] shadow-sm mb-6">
        <h1 className="text-3xl font-bold text-[var(--color-textPrimary)] mb-2">Settings</h1>
        <p className="text-[var(--color-textMuted)]">Customize your NextStop experience</p>
      </div>

      {/* Account Section */}
      {userEmail && (
        <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)] shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <User className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-xl font-semibold text-[var(--color-textPrimary)]">Account</h2>
          </div>
          <div className="bg-[var(--color-background)] rounded-xl p-4 mb-4">
            <p className="text-sm text-[var(--color-textMuted)] mb-1">Signed in as</p>
            <p className="font-medium text-[var(--color-textPrimary)]">{userEmail}</p>
          </div>
          {onLogout && (
            <button
              onClick={onLogout}
              className="w-full px-4 py-3 bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] text-white font-semibold rounded-xl hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            >
              <LogOut className="w-5 h-5" />
              <span>Log Out</span>
            </button>
          )}
        </div>
      )}

      {/* Color Theme Customization */}
      {onThemeChange && (
        <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)] shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Palette className="w-5 h-5 text-[var(--color-primary)]" />
            <h2 className="text-xl font-semibold text-[var(--color-textPrimary)]">Color Theme</h2>
          </div>
          <p className="text-sm text-[var(--color-textMuted)] mb-4">
            Choose a color scheme that matches your style or create your own
          </p>
          <ColorThemeSelector
            currentTheme={currentTheme}
            onThemeChange={onThemeChange}
            customTheme={customTheme}
            onCreateCustom={() => setShowCustomThemeCreator(true)}
            onEditCustom={() => setShowCustomThemeCreator(true)}
            onDeleteCustom={onDeleteCustomTheme}
          />
        </div>
      )}

      {/* Class Schedule */}
      <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)] shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Sparkles className="w-5 h-5 text-[var(--color-secondary)]" />
          <h2 className="text-xl font-semibold text-[var(--color-textPrimary)]">Class Schedule</h2>
        </div>
        <div className="space-y-3">
          {groupedClasses.length === 0 ? (
            <p className="text-sm text-[var(--color-textMuted)]">No imported classes yet</p>
          ) : groupedClasses.map((group) => (
            <div key={group.id} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-3">
              {editingGroupId === group.id ? (
                /* ── Edit form ── */
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <ClassEmojiCustomizer
                        classCode={group.code}
                        className={group.name}
                        currentEmoji={group.emoji}
                        compact
                        onEmojiChange={(emoji) => group.ids.forEach((id) => onEmojiChange(id, emoji))}
                      />
                      <p className="text-sm font-semibold text-[var(--color-textPrimary)]">Edit Class</p>
                    </div>
                    {onDeleteClass && (
                      <button
                        type="button"
                        onClick={() => handleDeleteClass(group.ids)}
                        className="flex shrink-0 items-center gap-1.5 rounded-lg border border-[var(--color-dangerBorder)] bg-[var(--color-dangerSurface)] px-2.5 py-1.5 text-xs font-semibold text-[var(--color-danger)] transition-colors hover:opacity-90"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        Delete
                      </button>
                    )}
                  </div>
                  <input
                    placeholder="Code (e.g. CS 170)"
                    value={editForm.code}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, code: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                  <input
                    placeholder="Course name (e.g. Intro to AI)"
                    value={editForm.name}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                    className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
                  />
                  {editForm.sections.map((sec, idx) => (
                    <div key={idx} className="rounded-lg border border-[var(--color-border)] bg-white p-3 space-y-2">
                      {editForm.sections.length > 1 && (
                        <div className="flex items-center justify-between">
                          <p className="text-xs font-semibold text-[var(--color-textMuted)]">Section {idx + 1}</p>
                          <button type="button" onClick={() => setEditForm(p => ({ ...p, sections: p.sections.filter((_, i) => i !== idx) }))} className="text-[var(--color-textMuted)] hover:text-[var(--color-danger)]"><X className="h-3.5 w-3.5" /></button>
                        </div>
                      )}
                      <input
                        placeholder="Location (e.g. Soda 306) *"
                        value={sec.location}
                        onChange={(e) => updEditSec(idx, { location: e.target.value })}
                        className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-[var(--color-background)] ${sec.location.trim() ? 'border-[var(--color-border)]' : 'border-[var(--color-dangerBorder)]'}`}
                      />
                      <div>
                        <p className="mb-2 text-xs text-[var(--color-textMuted)]">Days</p>
                        <div className="flex gap-2">
                          {DAY_OPTIONS.map(([label, day]) => (
                            <button key={day} type="button" onClick={() => togEditDay(idx, day)}
                              className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${sec.days.includes(day) ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-textSecondary)]'}`}>
                              {label}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        <div className="min-w-0">
                          <p className="mb-1 text-xs text-[var(--color-textMuted)]">Start</p>
                          <input type="time" value={sec.startTime} onChange={(e) => updEditSec(idx, { startTime: e.target.value })} className="nextstop-time-input block w-full max-w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
                        </div>
                        <div className="min-w-0">
                          <p className="mb-1 text-xs text-[var(--color-textMuted)]">End</p>
                          <input type="time" value={sec.endTime} onChange={(e) => updEditSec(idx, { endTime: e.target.value })} className="nextstop-time-input block w-full max-w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
                        </div>
                      </div>
                    </div>
                  ))}
                  <button type="button" onClick={() => setEditForm(p => ({ ...p, sections: [...p.sections, { ...EMPTY_SECTION }] }))}
                    className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-textMuted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
                    <Plus className="h-4 w-4" />Add section
                  </button>
                  <div className="flex gap-2 pt-1">
                    <button type="button" onClick={() => setEditingGroupId(null)} className="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-textSecondary)] transition-colors hover:bg-[var(--color-accent)]">Cancel</button>
                    <button type="button" onClick={() => handleSaveEdit(group.ids)} disabled={!editForm.code.trim() || editForm.sections.some(s => !s.days.length || !s.location.trim())} className="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40">Save Class</button>
                  </div>
                </div>
              ) : (
                /* ── Normal view ── */
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-[var(--color-textPrimary)]">{group.code}</p>
                    <button
                      type="button"
                      onClick={() => {
                        setEditForm({
                          code: group.code,
                          name: group.name,
                          sections: group.meetingLines.map(meeting => {
                            const mIdSet = new Set(meeting.ids);
                            const days = [...new Set(
                              schedule
                                .filter(c => mIdSet.has(c.id))
                                .map(c => c.startTime?.getDay())
                                .filter((d): d is number => d !== undefined)
                            )];
                            return { location: meeting.location, days, startTime: formatTimeInput(meeting.startTime), endTime: formatTimeInput(meeting.endTime) };
                          }),
                        });
                        setEditingGroupId(group.id);
                      }}
                      className="rounded-lg border border-[var(--color-border)] p-1.5 text-[var(--color-textMuted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
                      aria-label="Edit class"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {group.meetingLines.map((meeting) => (
                    <div key={meeting.ids.join(',')} className="space-y-0.5">
                      <div className="flex items-center gap-1.5 text-xs text-[var(--color-textSecondary)]">
                        <Clock className="h-3.5 w-3.5 shrink-0 text-[var(--color-primary)]" />
                        <span className="font-medium">{meeting.dayText}</span>
                        <span>{formatCompactTime(meeting.startTime)}–{formatCompactTime(meeting.endTime)}</span>
                      </div>
                      {meeting.location && (
                        <div className="flex items-center gap-1.5 text-xs text-[var(--color-textMuted)]">
                          <MapPin className="h-3.5 w-3.5 shrink-0" />
                          <span>{meeting.location}</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>

        {!showAddForm ? (
          <button
            onClick={() => setShowAddForm(true)}
            className="mt-3 flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] px-4 py-3 text-sm font-medium text-[var(--color-textMuted)] transition-colors hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <Plus className="h-4 w-4" />
            Add class manually
          </button>
        ) : (
          <div className="mt-3 space-y-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <p className="text-sm font-semibold text-[var(--color-textPrimary)]">New Class</p>
            <input
              placeholder="Code (e.g. CS 170)"
              value={addForm.code}
              onChange={(e) => setAddForm((prev) => ({ ...prev, code: e.target.value }))}
              className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            <input
              placeholder="Course name (e.g. Intro to AI)"
              value={addForm.name}
              onChange={(e) => setAddForm((prev) => ({ ...prev, name: e.target.value }))}
              className="w-full rounded-lg border border-[var(--color-border)] bg-white px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)]"
            />
            {addForm.sections.map((sec, idx) => (
              <div key={idx} className="rounded-lg border border-[var(--color-border)] bg-white p-3 space-y-2">
                {addForm.sections.length > 1 && (
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-[var(--color-textMuted)]">Section {idx + 1}</p>
                    <button type="button" onClick={() => setAddForm(p => ({ ...p, sections: p.sections.filter((_, i) => i !== idx) }))} className="text-[var(--color-textMuted)] hover:text-[var(--color-danger)]"><X className="h-3.5 w-3.5" /></button>
                  </div>
                )}
                <input
                  placeholder="Location (e.g. Soda 306) *"
                  value={sec.location}
                  onChange={(e) => updAddSec(idx, { location: e.target.value })}
                  className={`w-full rounded-lg border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-[var(--color-accent)] bg-[var(--color-background)] ${sec.location.trim() ? 'border-[var(--color-border)]' : 'border-[var(--color-dangerBorder)]'}`}
                />
                <div>
                  <p className="mb-2 text-xs text-[var(--color-textMuted)]">Days</p>
                  <div className="flex gap-2">
                    {DAY_OPTIONS.map(([label, day]) => (
                      <button key={day} type="button" onClick={() => togAddDay(idx, day)}
                        className={`flex-1 rounded-lg py-1.5 text-xs font-semibold transition-colors ${sec.days.includes(day) ? 'bg-[var(--color-primary)] text-white' : 'border border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-textSecondary)]'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="min-w-0">
                    <p className="mb-1 text-xs text-[var(--color-textMuted)]">Start</p>
                    <input type="time" value={sec.startTime} onChange={(e) => updAddSec(idx, { startTime: e.target.value })} className="nextstop-time-input block w-full max-w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
                  </div>
                  <div className="min-w-0">
                    <p className="mb-1 text-xs text-[var(--color-textMuted)]">End</p>
                    <input type="time" value={sec.endTime} onChange={(e) => updAddSec(idx, { endTime: e.target.value })} className="nextstop-time-input block w-full max-w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[var(--color-accent)]" />
                  </div>
                </div>
              </div>
            ))}
            <button type="button" onClick={() => setAddForm(p => ({ ...p, sections: [...p.sections, { ...EMPTY_SECTION }] }))}
              className="flex w-full items-center gap-2 rounded-xl border-2 border-dashed border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-textMuted)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]">
              <Plus className="h-4 w-4" />Add section
            </button>
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={() => setShowAddForm(false)} className="flex-1 rounded-xl border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-textSecondary)] transition-colors hover:bg-[var(--color-accent)]">Cancel</button>
              <button type="button" onClick={handleAddClass} disabled={!addForm.code.trim() || addForm.sections.some(s => !s.days.length || !s.location.trim())} className="flex-1 rounded-xl bg-[var(--color-primary)] px-4 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-40">Add Class</button>
            </div>
          </div>
        )}
      </div>

      {/* Notifications */}
      <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)] shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Bell className="w-5 h-5 text-[var(--color-secondary)]" />
          <h2 className="text-xl font-semibold text-[var(--color-textPrimary)]">Notifications</h2>
        </div>
        <div className="space-y-4">
          <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
            <div>
              <p className="font-medium text-[var(--color-textPrimary)]">Smart Departure Alerts</p>
              <p className="text-sm text-[var(--color-textMuted)]">Get notified when to leave for the bus station</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={smartNotificationsEnabled}
                onChange={(e) => onToggleSmartNotifications?.(e.target.checked)}
              />
              <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-accent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3 border-b border-[var(--color-border)]">
            <div>
              <p className="font-medium text-[var(--color-textPrimary)]">Bus Capacity Alerts</p>
              <p className="text-sm text-[var(--color-textMuted)]">Alert when buses are getting full</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={capacityAlertsEnabled}
                onChange={(e) => onToggleCapacityAlerts?.(e.target.checked)}
              />
              <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-accent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
            </label>
          </div>

          <div className="flex items-center justify-between py-3">
            <div>
              <p className="font-medium text-[var(--color-textPrimary)]">Delay Notifications</p>
              <p className="text-sm text-[var(--color-textMuted)]">Get alerts about bus delays</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                className="sr-only peer"
                checked={delayNotificationsEnabled}
                onChange={(e) => onToggleDelayNotifications?.(e.target.checked)}
              />
              <div className="w-11 h-6 bg-[var(--color-border)] peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[var(--color-accent)] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-[var(--color-border)] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--color-primary)]"></div>
            </label>
          </div>
        </div>
        {onTestNotification && (
          <button
            onClick={onTestNotification}
            className="mt-4 w-full flex items-center justify-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-4 py-3 text-sm font-medium text-[var(--color-textSecondary)] hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] transition-colors"
          >
            <Bell className="w-4 h-4" />
            Send test notification (fires in 5 sec)
          </button>
        )}
        <div className="mt-4">
          <SmartNotifications
            nextClass={nextClassForAlerts ? {
              id: nextClassForAlerts.id,
              code: nextClassForAlerts.code,
              name: nextClassForAlerts.name,
              location: nextClassForAlerts.location || '',
              startTime: nextClassForAlerts.startTime || currentTime,
              buildingCode: nextClassForAlerts.buildingCode || ''
            } : null}
            buses={busesForAlerts}
            currentTime={currentTime}
            enabled={smartNotificationsEnabled}
            onToggle={(enabled) => onToggleSmartNotifications?.(enabled)}
            showToggleControl={false}
          />
        </div>
      </div>

      {/* Home & Study Spots */}
      <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)] shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Home className="w-5 h-5 text-[var(--color-primary)]" />
          <h2 className="text-xl font-semibold text-[var(--color-textPrimary)]">Home & Study Spot</h2>
        </div>
        <p className="text-sm text-[var(--color-textMuted)] mb-4">
          Set your home and study spot to get quick route tiles on the home screen when you're away.
        </p>
        <div className="space-y-4">
          {/* Home address */}
          <div>
            <p className="text-xs font-semibold text-[var(--color-textSecondary)] uppercase tracking-wide mb-1.5">Home</p>
            {homeAddress ? (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5">
                <Home className="h-4 w-4 shrink-0 text-[var(--color-primary)]" />
                <span className="flex-1 truncate text-sm text-[var(--color-textPrimary)]">{homeAddress.name}</span>
                <button onClick={() => onSetHomeAddress?.(null)} className="text-[var(--color-textMuted)] hover:text-[var(--color-danger)]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5">
                  <Search className="h-4 w-4 shrink-0 text-[var(--color-textMuted)]" />
                  <input
                    value={homeQuery}
                    onChange={(e) => setHomeQuery(e.target.value)}
                    placeholder="Search home address…"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                {homeResults.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-lg">
                    {homeResults.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--color-accent)]"
                          onClick={() => { onSetHomeAddress?.({ name: r.name, lat: r.lat, lng: r.lng }); setHomeQuery(''); setHomeResults([]); }}
                        >
                          <p className="font-medium text-[var(--color-textPrimary)]">{r.name}</p>
                          {r.address && <p className="text-xs text-[var(--color-textMuted)]">{r.address}</p>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
          {/* Study spot */}
          <div>
            <p className="text-xs font-semibold text-[var(--color-textSecondary)] uppercase tracking-wide mb-1.5">Study Spot</p>
            {studySpot ? (
              <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-background)] px-3 py-2.5">
                <BookOpen className="h-4 w-4 shrink-0 text-[var(--color-secondary)]" />
                <span className="flex-1 truncate text-sm text-[var(--color-textPrimary)]">{studySpot.name}</span>
                <button onClick={() => onSetStudySpot?.(null)} className="text-[var(--color-textMuted)] hover:text-[var(--color-danger)]">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="relative">
                <div className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] bg-white px-3 py-2.5">
                  <Search className="h-4 w-4 shrink-0 text-[var(--color-textMuted)]" />
                  <input
                    value={studyQuery}
                    onChange={(e) => setStudyQuery(e.target.value)}
                    placeholder="Search study spot…"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
                {studyResults.length > 0 && (
                  <ul className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-[var(--color-border)] bg-white shadow-lg">
                    {studyResults.map((r) => (
                      <li key={r.id}>
                        <button
                          type="button"
                          className="w-full px-4 py-2.5 text-left text-sm hover:bg-[var(--color-accent)]"
                          onClick={() => { onSetStudySpot?.({ name: r.name, lat: r.lat, lng: r.lng }); setStudyQuery(''); setStudyResults([]); }}
                        >
                          <p className="font-medium text-[var(--color-textPrimary)]">{r.name}</p>
                          {r.address && <p className="text-xs text-[var(--color-textMuted)]">{r.address}</p>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Calendar Integration */}
      <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)] shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Calendar className="w-5 h-5 text-[var(--color-secondary)]" />
          <h2 className="text-xl font-semibold text-[var(--color-textPrimary)]">Calendar Integration</h2>
        </div>
        <p className="text-sm text-[var(--color-textMuted)] mb-4">
          Import an .ics calendar file to sync class schedules
        </p>
        <div className="space-y-3">
          <input
            ref={calendarFileInputRef}
            type="file"
            accept=".ics,text/calendar"
            className="hidden"
            onChange={(event) => handleCalendarFileChange(event.target.files?.[0])}
          />
          <button
            onClick={() => calendarFileInputRef.current?.click()}
            className="w-full px-4 py-3 border-2 border-[var(--color-border)] rounded-xl hover:border-[var(--color-primary)] hover:bg-[var(--color-accent)] transition-all text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-accent)] rounded-lg flex items-center justify-center">
                📅
              </div>
              <div>
                <p className="font-medium text-[var(--color-textPrimary)]">Google Calendar .ics</p>
                <p className="text-xs text-[var(--color-textMuted)]">Import exported calendar file</p>
              </div>
            </div>
            <span className="text-sm text-[var(--color-primary)] font-medium">Import</span>
          </button>

          <button
            onClick={() => calendarFileInputRef.current?.click()}
            className="w-full px-4 py-3 border-2 border-[var(--color-border)] rounded-xl hover:border-[var(--color-secondary)] hover:bg-[var(--color-accent)] transition-all text-left flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[var(--color-accent)] rounded-lg flex items-center justify-center">
                <Upload className="w-5 h-5 text-[var(--color-secondary)]" />
              </div>
              <div>
                <p className="font-medium text-[var(--color-textPrimary)]">bCourses/Canvas .ics</p>
                <p className="text-xs text-[var(--color-textMuted)]">Import downloaded schedule</p>
              </div>
            </div>
            <span className="text-sm text-[var(--color-secondary)] font-medium">Import</span>
          </button>
          {calendarImportStatus && (
            <p className="text-sm text-[var(--color-textMuted)] px-1">{calendarImportStatus}</p>
          )}
        </div>
      </div>

      {/* Data & Privacy */}
      <div className="bg-white rounded-2xl p-6 border border-[var(--color-border)] shadow-sm mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-5 h-5 text-[var(--color-textMuted)]" />
          <h2 className="text-xl font-semibold text-[var(--color-textPrimary)]">Data & Privacy</h2>
        </div>
        <div className="space-y-3">
          <button
            onClick={handleExportData}
            disabled={!onExportData}
            className="w-full px-4 py-3 bg-[var(--color-background)] rounded-xl hover:bg-[var(--color-accent)] transition-all text-left disabled:opacity-50"
          >
            <p className="font-medium text-[var(--color-textPrimary)]">Export Your Data</p>
            <p className="text-sm text-[var(--color-textMuted)] mt-1">Download all your preferences and history</p>
          </button>
          <button
            onClick={handleClearData}
            disabled={!onClearData}
            className="w-full px-4 py-3 bg-[var(--color-dangerSurface)] rounded-xl hover:opacity-90 transition-all text-left disabled:opacity-50"
          >
            <p className="font-medium text-[var(--color-danger)]">Clear All Data</p>
            <p className="text-sm text-[var(--color-danger)] opacity-80 mt-1">Reset app to default settings</p>
          </button>
          {dataActionStatus && (
            <p className="px-1 text-sm text-[var(--color-textMuted)]">{dataActionStatus}</p>
          )}
        </div>
      </div>

      {/* Semester Wrapped */}
      <div className="bg-gradient-to-br from-[var(--color-primary)] to-[var(--color-secondary)] rounded-2xl p-6 border-2 border-[var(--color-primary)] shadow-lg mb-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-6 h-6 text-white" />
              <h2 className="text-xl font-bold text-white">Semester Wrapped</h2>
            </div>
            <p className="text-white/90 text-sm mb-4">
              View your semester journey! See your total trips, CO₂ saved, favorite bus lines, achievements, and more.
            </p>
            <button
              onClick={onOpenSemesterWrapped}
              className="px-6 py-3 bg-white text-[var(--color-primary)] font-semibold rounded-xl hover:bg-white/90 transition-all shadow-md hover:shadow-lg"
            >
              View My Semester 🎉
            </button>
          </div>
          <div className="text-5xl ml-4">
            ✨
          </div>
        </div>
      </div>

      {/* About */}
      <div className="bg-gradient-to-br from-[var(--color-background)] to-[var(--color-accent)] rounded-2xl p-6 border border-[var(--color-border)]">
        <div className="flex items-center gap-2 mb-3">
          <Info className="w-5 h-5 text-[var(--color-secondary)]" />
          <h2 className="text-xl font-semibold text-[var(--color-textPrimary)]">About</h2>
        </div>
        <p className="text-sm text-[var(--color-textMuted)] mb-4">
          Your smart campus transit companion, designed to help you get to class on time while making the journey fun!
        </p>
        <div className="flex items-center gap-4 text-sm text-[var(--color-textMuted)]">
          <span>Version 1.0.0</span>
          <span>•</span>
          <span className="text-[var(--color-textMuted)]">Privacy Policy</span>
          <span>•</span>
          <span className="text-[var(--color-textMuted)]">Terms</span>
        </div>
      </div>

      {/* Custom Theme Creator Modal */}
      {showCustomThemeCreator && (
        <CustomThemeCreator
          onSave={handleSaveCustomTheme}
          onClose={() => setShowCustomThemeCreator(false)}
          initialColors={customTheme?.colors}
        />
      )}
    </div>
  );
}
