import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { AttendanceType, AttendanceRecord, UserProfile, LeaveRecord, LeaveStatus, UserRole, OrganizationMember, Announcement, Language, WorkMode, LeaveType, SystemSettings, OfficeLocation, DailySummaryRecord, ContentPlan, PayrollRecord, CompensationSettings } from './types';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import History from './components/History';
import GeminiInsights from './components/GeminiInsights';
import FaceScanner from './components/FaceScanner';
import Profile from './components/Profile';
import LeaveManager from './components/LeaveManager';
import Organization from './components/Organization';
import Announcements from './components/Announcements';
import ContentCalendar from './components/ContentCalendar';
import PayrollManager from './components/PayrollManager';
import AdminConsole from './components/AdminConsole';
import PermissionManager from './components/PermissionManager';
import TeamStatusCard from './components/TeamStatusCard';
import TeamManagement from './components/TeamManagement';
import MktDashboard from './components/MktDashboard';
import PINLogin from './components/PINLogin';
import { verifyFace, reverseGeocode } from './services/gemini';
import { verifyFaceLocal, initFaceDetection } from './services/faceService';
import { isOnline } from './services/supabase';
import { syncUsers, syncAttendance, syncLeaves, syncAnnouncements, syncContentPlans, syncPayroll, syncCompensation, syncDailySummaries, syncSettings, deleteUser, deleteDailySummary, deleteAnnouncement, deleteContentPlan } from './services/syncService';

const APP_DATA_KEY = 'global_work_pro_v9_data'; // Bumped for a fresh start with total stability
const CURRENT_USER_ID_KEY = 'global_work_pro_v9_user';

// Helper for geofencing distance calculation
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371e3; // metres
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp / 2) * Math.sin(dp / 2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl / 2) * Math.sin(dl / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const safeClone = (obj: any) => JSON.parse(JSON.stringify(obj));

const DEFAULT_USERS: UserProfile[] = [
  {
    id: 'usr_owner',
    name: "OWNER",
    position: "System Owner",
    department: "Administration",
    employeeId: "GW-OWNER-001",
    joinDate: "2024-01-01",
    company: "GlobalWork Pro",
    avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=Owner",
    role: UserRole.ADMIN,
    pin: '435600',
    leaveBalances: { sick: 99, annual: 99, personal: 99 }
  }
];

const DEFAULT_SETTINGS: SystemSettings = {
  lateThresholdMinute: 15,
  officeLocations: [
    { id: 'loc1', name: 'Global HQ', latitude: 13.7563, longitude: 100.5018, radius: 500 }
  ],
  workStartTimes: [{ name: 'กะเช้า', startTime: '09:00', endTime: '18:00' }],
  availableRoles: [UserRole.ADMIN, UserRole.EMPLOYEE, 'MANAGER', 'OPERATOR'],
  teams: []
};

const MOCK_ANNOUNCEMENTS: Announcement[] = [
  { id: 'a1', title: 'Update: Hybrid Work Policy 2025', content: 'Starting March 1st, we are transitioning to a 3-2 flexible model...', date: '2025-02-20', author: 'HR Department', category: 'POLICY' },
];

const App: React.FC = () => {
  // 1. Initial Data Loader
  const getBootData = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(APP_DATA_KEY) || '{}');
      const users = (Array.isArray(saved.users) && saved.users.length > 0) ? saved.users : safeClone(DEFAULT_USERS);

      // Inject Owner if missing or update it
      const ownerBase = { ...DEFAULT_USERS[0], id: 'usr_owner' };
      const oIdx = users.findIndex((u: any) => u.id === 'usr_owner' || u.name === 'OWNER');
      if (oIdx !== -1) users[oIdx] = { ...users[oIdx], ...ownerBase, id: users[oIdx].id };
      else users.unshift(ownerBase);

      return {
        users,
        recordsMap: saved.recordsMap || {},
        leaves: Array.isArray(saved.leaves) ? saved.leaves : [],
        settings: { ...DEFAULT_SETTINGS, ...(saved.settings || {}), teams: saved.settings?.teams || [] },
        dailySummaries: Array.isArray(saved.dailySummaries) ? saved.dailySummaries : [],
        announcements: Array.isArray(saved.announcements) ? saved.announcements : safeClone(MOCK_ANNOUNCEMENTS),
        contentPlans: Array.isArray(saved.contentPlans) ? saved.contentPlans : [],
        payrollRecords: Array.isArray(saved.payrollRecords) ? saved.payrollRecords : [],
        compensationSettings: Array.isArray(saved.compensationSettings) ? saved.compensationSettings : [],
        lang: (localStorage.getItem('gw_lang_v9') as Language) || Language.TH,
        tab: (localStorage.getItem('gw_tab_v9') as any) || 'dashboard'
      };
    } catch (e) {
      return { users: safeClone(DEFAULT_USERS), recordsMap: {}, leaves: [], settings: safeClone(DEFAULT_SETTINGS), lang: Language.TH, tab: 'dashboard' };
    }
  };

  const [boot] = useState(getBootData);

  // 2. States
  const [allUsers, setAllUsers] = useState<UserProfile[]>(boot.users);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(() => {
    const uid = localStorage.getItem(CURRENT_USER_ID_KEY);
    return boot.users.find((u: any) => u.id === uid) || null;
  });

  const [records, setRecords] = useState<AttendanceRecord[]>(() => {
    const uid = localStorage.getItem(CURRENT_USER_ID_KEY);
    return uid ? (boot.recordsMap[uid] || []) : [];
  });

  // CRITICAL: Protection Ref to track record ownership
  const recordsOwnerRef = useRef<string | null>(currentUser?.id || null);

  const [leaves, setLeaves] = useState<LeaveRecord[]>(boot.leaves);
  const [settings, setSettings] = useState<SystemSettings>(boot.settings);
  const [lang, setLang] = useState<Language>(boot.lang);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'leave' | 'profile' | 'organization' | 'announcements' | 'admin' | 'calendar' | 'mkt' | 'payroll' | 'permissions' | 'teams'>(boot.tab);

  const [isClockedIn, setIsClockedIn] = useState(() => records.length > 0 && records[0].type === AttendanceType.CHECK_IN);
  const [showScanner, setShowScanner] = useState(false);
  const [pendingAction, setPendingAction] = useState<any>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [allRecordsMap, setAllRecordsMap] = useState<Record<string, AttendanceRecord[]>>(boot.recordsMap);
  const [dailySummaries, setDailySummaries] = useState<DailySummaryRecord[]>(boot.dailySummaries);
  const [announcements, setAnnouncements] = useState<Announcement[]>(boot.announcements);
  const [contentPlans, setContentPlans] = useState<ContentPlan[]>(boot.contentPlans);
  const [payrollRecords, setPayrollRecords] = useState<PayrollRecord[]>(boot.payrollRecords);
  const [compensationSettings, setCompensationSettings] = useState<CompensationSettings[]>(boot.compensationSettings);
  const [scannerMessage, setScannerMessage] = useState("");
  const [successModal, setSuccessModal] = useState<{ show: boolean; message: string }>({ show: false, message: "" });

  const isBooted = useRef(false);

  // 3. Centralized Save Effect (V9: Safe Persistence Hub)
  useEffect(() => {
    if (!isBooted.current) { isBooted.current = true; return; }

    try {
      const bundle = {
        users: allUsers,
        recordsMap: allRecordsMap,
        leaves,
        settings,
        dailySummaries,
        announcements,
        contentPlans,
        payrollRecords,
        compensationSettings
      };

      localStorage.setItem(APP_DATA_KEY, JSON.stringify(bundle));
      if (currentUser) localStorage.setItem(CURRENT_USER_ID_KEY, currentUser.id);
      else localStorage.removeItem(CURRENT_USER_ID_KEY);

      localStorage.setItem('gw_lang_v9', lang);
      localStorage.setItem('gw_tab_v9', activeTab);
    } catch (e) {
      console.error("Save Protection Failure:", e);
    }
  }, [allUsers, allRecordsMap, leaves, settings, lang, activeTab, currentUser, dailySummaries, announcements, contentPlans, payrollRecords, compensationSettings]);

  // 3b. Supabase Sync Effect - Load from cloud on mount, then sync changes
  const hasSyncedOnMount = useRef(false);

  useEffect(() => {
    if (!isOnline) {
      console.log('⚠️ Offline mode - using localStorage only');
      return;
    }

    const syncData = async () => {
      try {
        console.log('🔄 Starting Supabase sync...');

        // STEP 1: Load data from Supabase (pull from cloud)
        const [
          syncedUsers,
          syncedLeaves,
          syncedAnnouncements,
          syncedContentPlans,
          syncedPayroll,
          syncedCompensation,
          syncedSummaries,
          syncedSettings
        ] = await Promise.all([
          syncUsers(allUsers),
          syncLeaves(leaves),
          syncAnnouncements(announcements),
          syncContentPlans(contentPlans),
          syncPayroll(payrollRecords),
          syncCompensation(compensationSettings),
          syncDailySummaries(dailySummaries),
          syncSettings(settings)
        ]);

        // STEP 2: Update local state with cloud data
        setAllUsers(syncedUsers);
        setLeaves(syncedLeaves);
        setAnnouncements(syncedAnnouncements);
        setContentPlans(syncedContentPlans);
        setPayrollRecords(syncedPayroll);
        setCompensationSettings(syncedCompensation);
        setDailySummaries(syncedSummaries);
        setSettings(syncedSettings);

        // STEP 3: Sync attendance for current user
        if (currentUser) {
          const syncedAttendance = await syncAttendance(currentUser.id, records);
          setRecords(syncedAttendance);
          setAllRecordsMap(prev => ({ ...prev, [currentUser.id]: syncedAttendance }));
        }

        console.log('✅ Supabase sync completed successfully');
        console.log(`📊 Synced ${syncedUsers.length} users from cloud`);
      } catch (error) {
        console.error('❌ Supabase sync error:', error);
      }
    };

    // Run sync on mount (once) and when data changes
    if (!hasSyncedOnMount.current) {
      hasSyncedOnMount.current = true;
      syncData(); // Initial sync on mount
    } else {
      // Debounce subsequent syncs
      const timer = setTimeout(syncData, 1000);
      return () => clearTimeout(timer);
    }
  }, [allUsers.length, leaves.length, announcements.length, contentPlans.length, payrollRecords.length, compensationSettings.length, dailySummaries.length, currentUser?.id]);

  // 4. User Switching Logic (V9: Atomic & Safe)
  useEffect(() => {
    if (currentUser) {
      const data = JSON.parse(localStorage.getItem(APP_DATA_KEY) || '{}');
      const userRecs = (data.recordsMap || {})[currentUser.id] || [];

      // Atomic Update sequence
      recordsOwnerRef.current = currentUser.id;
      setRecords(userRecs);
      setIsClockedIn(userRecs.length > 0 && userRecs[0].type === AttendanceType.CHECK_IN);
    } else {
      recordsOwnerRef.current = null;
      setRecords([]);
      setIsClockedIn(false);
    }
  }, [currentUser]);

  // 5. Team Status Memo
  const teamMembers: OrganizationMember[] = useMemo(() => {
    const data = JSON.parse(localStorage.getItem(APP_DATA_KEY) || '{}');
    const recordsMap = data.recordsMap || {};
    const leavesList = leaves; // Use current state leaves
    const todayStr = new Date().toISOString().split('T')[0];

    return allUsers.map(u => {
      const uRecs = recordsMap[u.id] || [];
      const latest = uRecs[0];
      const isActive = latest && latest.type === AttendanceType.CHECK_IN;
      const isOnLeave = leavesList.some((l: any) =>
        l.employeeId === u.employeeId && l.status === LeaveStatus.APPROVED && todayStr >= l.startDate && todayStr <= l.endDate
      );

      let status: 'ACTIVE' | 'ON_LEAVE' | 'OFFLINE' = 'OFFLINE';
      if (isOnLeave) status = 'ON_LEAVE';
      else if (isActive) status = 'ACTIVE';

      return {
        id: u.id, name: u.name, position: u.position, department: u.department,
        status: isOnLeave ? 'ON_LEAVE' : (isActive ? 'ACTIVE' : 'OFFLINE'),
        avatar: u.avatar, email: 'user@globalwork.pro',
        leaveBalances: u.leaveBalances,
        teamId: u.teamId
      };
    });
  }, [allUsers, records, leaves]);

  useEffect(() => { initFaceDetection().catch(console.error); }, []);

  const executeAttendanceAction = useCallback(async (type: AttendanceType, note?: string, workMode?: WorkMode) => {
    if (!currentUser) return;

    setScannerMessage(lang === Language.TH ? "กำลังตรวจพิกัด GPS..." : "Verifying GPS...");
    const pos = await new Promise<GeolocationPosition | null>((res) => {
      if (!navigator.geolocation) return res(null);
      navigator.geolocation.getCurrentPosition(res, () => res(null), { timeout: 8000, enableHighAccuracy: true });
    });

    if (!pos && workMode !== WorkMode.REMOTE) {
      setScannerMessage(lang === Language.TH ? "ไม่พบค่านำทาง (โปรดเปิด GPS)" : "GPS Unavailable (Please enable GPS)");
      setIsVerifying(false);
      return;
    }

    // Geofencing Check
    if (workMode !== WorkMode.REMOTE && settings.officeLocations.length > 0 && settings.enableGeofencing !== false) {
      let closestDistance = Infinity;
      let closestLocation = '';

      const isInRange = settings.officeLocations.some(loc => {
        const dist = calculateDistance(pos!.coords.latitude, pos!.coords.longitude, loc.latitude, loc.longitude);
        if (dist < closestDistance) {
          closestDistance = dist;
          closestLocation = loc.name;
        }
        return dist <= loc.radius;
      });

      if (!isInRange) {
        const distanceInMeters = Math.round(closestDistance);
        const debugInfo = `\n\n📍 ตำแหน่งปัจจุบัน: ${pos!.coords.latitude.toFixed(6)}, ${pos!.coords.longitude.toFixed(6)}\n📏 ระยะห่างจาก ${closestLocation}: ${distanceInMeters} เมตร\n✅ ต้องอยู่ภายใน: ${settings.officeLocations[0].radius} เมตร`;

        setScannerMessage(lang === Language.TH
          ? `คุณอยู่นอกพื้นที่ปฏิบัติงาน ไม่สามารถลงเวลาได้${debugInfo}`
          : `Out of range. Attendance restricted to authorized locations.${debugInfo}`);
        setIsVerifying(false);
        return;
      }
    }

    let addr = lang === Language.TH ? "สำนักงานหลัก" : "Global HQ";
    if (pos) addr = await reverseGeocode(pos.coords.latitude, pos.coords.longitude, lang);

    const newRec: AttendanceRecord = {
      id: crypto.randomUUID(), type, workMode: workMode || WorkMode.OFFICE,
      timestamp: Date.now(), timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      notes: note, location: pos ? { latitude: pos.coords.latitude, longitude: pos.coords.longitude, address: addr } : undefined
    };

    setRecords(prev => {
      const updated = [newRec, ...prev];
      setAllRecordsMap(map => ({ ...map, [currentUser.id]: updated }));
      return updated;
    });
    setIsClockedIn(type === AttendanceType.CHECK_IN);
    setShowScanner(false);
    setIsVerifying(false);
    setPendingAction(null);

    // Success Alert
    const msg = type === AttendanceType.CHECK_IN
      ? (lang === Language.TH ? "ลงเวลาเข้างานสำเร็จ! ✅" : "Clock-in Successful! ✅")
      : (lang === Language.TH ? "ลงเวลาออกงานสำเร็จ! ✅" : "Clock-out Successful! ✅");
    setTimeout(() => {
      setSuccessModal({ show: true, message: msg });
      setTimeout(() => setSuccessModal({ show: false, message: "" }), 2500);
    }, 100);
  }, [lang, currentUser, settings.officeLocations]);

  const handleStartAction = (type: AttendanceType, note?: string, workMode?: WorkMode) => {
    setPendingAction({ type, note, workMode });
    setShowScanner(true);
    setScannerMessage("");
  };

  const handleSwitchAccount = () => {
    setCurrentUser(null);
    setActiveTab('dashboard');
  };

  const handleLeaveApproval = (id: string, stage: LeaveStatus) => {
    setLeaves(prev => prev.map(l => l.id === id ? { ...l, status: stage } : l));
  };

  const handleUpdateMember = (id: string, data: any) => {
    setAllUsers(prev => prev.map(u => {
      if (u.id === id) {
        const updated = { ...u, ...data };
        if (data.pin === '') delete updated.pin; // Keep existing if empty
        return updated;
      }
      return u;
    }));
  };

  const handleCreateMember = (data: any) => {
    const newUser: UserProfile = {
      id: `usr_${Math.random().toString(36).slice(2, 10)}`,
      name: data.name || 'New Member',
      role: data.role || UserRole.EMPLOYEE,
      position: data.position || 'Staff',
      department: data.department || 'General',
      pin: data.pin || '0000',
      employeeId: `GW-${Date.now().toString().slice(-4)}`,
      joinDate: new Date().toISOString().split('T')[0],
      company: "GlobalWork Pro",
      avatar: data.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
      leaveBalances: { sick: 15, annual: 15, personal: 7 }
    };
    setAllUsers(prev => [...prev, newUser]);
  };

  const handleAddSummary = (data: Omit<DailySummaryRecord, 'id'>) => {
    const newSummary = { ...data, id: crypto.randomUUID() };
    setDailySummaries(prev => [newSummary, ...prev]);
  };

  const handleDeleteSummary = async (id: string) => {
    setDailySummaries(prev => prev.filter(s => s.id !== id));
    await deleteDailySummary(id); // Delete from Supabase
  };

  // Team Management Functions
  const handleCreateTeam = (teamData: Omit<import('./types').Team, 'id' | 'createdAt'>) => {
    const newTeam: import('./types').Team = {
      ...teamData,
      id: `team_${Math.random().toString(36).slice(2, 10)}`,
      createdAt: Date.now()
    };
    setSettings(prev => ({
      ...prev,
      teams: [...prev.teams, newTeam]
    }));
  };

  const handleDeleteTeam = (teamId: string) => {
    // Remove team and unassign all members
    setSettings(prev => ({
      ...prev,
      teams: prev.teams.filter(t => t.id !== teamId)
    }));
    setAllUsers(prev => prev.map(u =>
      u.teamId === teamId ? { ...u, teamId: undefined } : u
    ));
  };

  const handleUpdateTeam = (teamId: string, updates: Partial<import('./types').Team>) => {
    setSettings(prev => ({
      ...prev,
      teams: prev.teams.map(t => t.id === teamId ? { ...t, ...updates } : t)
    }));
  };

  const handleAssignMemberToTeam = (memberId: string, teamId: string | null) => {
    setAllUsers(prev => prev.map(u =>
      u.id === memberId ? { ...u, teamId: teamId || undefined } : u
    ));

    // Update team memberIds
    if (teamId) {
      setSettings(prev => ({
        ...prev,
        teams: prev.teams.map(t => {
          if (t.id === teamId && !t.memberIds.includes(memberId)) {
            return { ...t, memberIds: [...t.memberIds, memberId] };
          }
          // Remove from other teams
          if (t.id !== teamId && t.memberIds.includes(memberId)) {
            return { ...t, memberIds: t.memberIds.filter(id => id !== memberId) };
          }
          return t;
        })
      }));
    } else {
      // Remove from all teams
      setSettings(prev => ({
        ...prev,
        teams: prev.teams.map(t => ({
          ...t,
          memberIds: t.memberIds.filter(id => id !== memberId)
        }))
      }));
    }
  };


  const handleAddAnnouncement = (data: Omit<Announcement, 'id'>) => {
    const newA = { ...data, id: crypto.randomUUID() };
    setAnnouncements(prev => [newA, ...prev]);
  };

  const handleDeleteAnnouncement = async (id: string) => {
    setAnnouncements(prev => prev.filter(a => a.id !== id));
    await deleteAnnouncement(id); // Delete from Supabase
  };

  const handleAddContentPlan = (plan: Omit<ContentPlan, 'id'>) => {
    const newPlan = { ...plan, id: crypto.randomUUID() };
    setContentPlans(prev => [newPlan, ...prev]);
  };

  const handleDeleteContentPlan = async (id: string) => {
    setContentPlans(prev => prev.filter(p => p.id !== id));
    await deleteContentPlan(id); // Delete from Supabase
  };

  const handleDeleteUser = async (id: string) => {
    // Prevent deleting OWNER
    if (id === 'usr_owner') {
      alert(lang === Language.TH ? 'ไม่สามารถลบบัญชี OWNER ได้' : 'Cannot delete OWNER account');
      return;
    }

    // Confirm deletion
    const confirmMsg = lang === Language.TH
      ? 'คุณแน่ใจหรือไม่ที่จะลบพนักงานคนนี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้'
      : 'Are you sure you want to delete this employee? This action cannot be undone.';

    if (!confirm(confirmMsg)) return;

    // Delete from local state
    setAllUsers(prev => prev.filter(u => u.id !== id));

    // Delete from Supabase
    await deleteUser(id);

    // If current user is deleted, logout
    if (currentUser?.id === id) {
      setCurrentUser(null);
      localStorage.removeItem(CURRENT_USER_ID_KEY);
    }
  };

  const handleUpdateCompensation = (data: CompensationSettings) => {
    setCompensationSettings(prev => {
      const existing = prev.find(c => c.employeeId === data.employeeId);
      if (existing) return prev.map(c => c.employeeId === data.employeeId ? { ...data, id: existing.id } : c);
      return [...prev, { ...data, id: crypto.randomUUID() }];
    });
  };

  const handleProcessPayroll = (data: Omit<PayrollRecord, 'id'>) => {
    const newRecord = { ...data, id: crypto.randomUUID() };
    setPayrollRecords(prev => [newRecord, ...prev]);
  };

  // CLEANUP: Ensure no blank screen during transitions by checking currentUser directly
  if (!currentUser) {
    return <PINLogin users={allUsers} onLogin={setCurrentUser} lang={lang} />;
  }

  return (
    <div className={`min-h-screen bg-slate-50 flex font-sans ${lang === Language.TH ? 'lang-th' : 'lang-en'}`}>
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        user={currentUser}
        lang={lang}
        rolePermissions={settings.rolePermissions}
      />
      <div className="flex-1 flex flex-col min-w-0">
        <Header user={currentUser} onToggleRole={handleSwitchAccount} lang={lang} onToggleLang={() => setLang(l => l === Language.TH ? Language.EN : Language.TH)} />
        <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-6 sm:py-10 space-y-6 pb-24 lg:pb-10">
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {activeTab === 'dashboard' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
                <div className="lg:col-span-2 space-y-6 sm:space-y-8">
                  <Dashboard isClockedIn={isClockedIn} onAction={handleStartAction} lastRecord={records[0]} allRecords={records} lang={lang} />
                  <GeminiInsights records={records} lang={lang} />
                </div>
                <div className="lg:col-span-1 space-y-6">
                  <TeamStatusCard members={teamMembers} teams={settings.teams || []} onViewAll={() => setActiveTab('organization')} lang={lang} />
                </div>
              </div>
            )}
            {activeTab === 'history' && <History records={records} lang={lang} settings={settings} allRecordsMap={currentUser.role === UserRole.ADMIN ? allRecordsMap : undefined} members={currentUser.role === UserRole.ADMIN ? allUsers : undefined} currentUserRole={currentUser.role} currentUser={currentUser} />}
            {activeTab === 'leave' && <LeaveManager leaves={leaves.filter(l => l.employeeId === currentUser.employeeId)} onRequest={(l: any) => setLeaves(p => [{ ...l, id: Date.now().toString(), status: LeaveStatus.PENDING, employeeName: currentUser.name, employeeId: currentUser.employeeId }, ...p])} user={currentUser} lang={lang} />}
            {activeTab === 'profile' && <Profile user={currentUser} records={records} leaves={leaves} lang={lang} onResetFaceID={() => {
              const u = { ...currentUser, storedFace: undefined, faceSignature: undefined };
              setCurrentUser(u);
              setAllUsers(prev => prev.map(it => it.id === u.id ? u : it));
            }} />}
            {activeTab === 'organization' && <Organization
              members={teamMembers}
              isAdmin={currentUser.role === UserRole.ADMIN}
              lang={lang}
              onUpdateMember={handleUpdateMember}
              onDeleteMember={handleDeleteUser}
              availableRoles={settings.availableRoles}
              teams={settings.teams || []}
              allUsers={allUsers}
              onCreateTeam={handleCreateTeam}
              onDeleteTeam={handleDeleteTeam}
              onUpdateTeam={handleUpdateTeam}
              onAssignMemberToTeam={handleAssignMemberToTeam}
            />}
            {activeTab === 'announcements' && <Announcements announcements={announcements} lang={lang} isAdmin={currentUser.role === UserRole.ADMIN} onAdd={handleAddAnnouncement} onDelete={handleDeleteAnnouncement} />}
            {activeTab === 'calendar' && <ContentCalendar plans={contentPlans} onAdd={handleAddContentPlan} onDelete={handleDeleteContentPlan} lang={lang} />}
            {activeTab === 'mkt' && <MktDashboard isAdmin={currentUser.role === UserRole.ADMIN} defaultStaff={currentUser.role !== UserRole.ADMIN ? (settings.mktViewPermissions?.[currentUser.id] || currentUser.name) : undefined} />}
            {activeTab === 'payroll' && currentUser.role === UserRole.ADMIN && <PayrollManager members={teamMembers} payroll={payrollRecords} compensation={compensationSettings} onUpdateCompensation={handleUpdateCompensation} onProcessPayroll={handleProcessPayroll} lang={lang} />}
            {activeTab === 'admin' && <AdminConsole leaves={leaves} onApprove={handleLeaveApproval} members={teamMembers} lang={lang} settings={settings} onUpdateSettings={setSettings} onCreateMember={handleCreateMember} onUpdateMember={handleUpdateMember} allRecordsMap={allRecordsMap} announcements={announcements} onAddAnnouncement={handleAddAnnouncement} onDeleteAnnouncement={handleDeleteAnnouncement} />}
            {activeTab === 'teams' && currentUser.role === UserRole.ADMIN && (
              <TeamManagement
                teams={settings.teams || []}
                members={allUsers}
                lang={lang}
                onCreateTeam={(team) => setSettings(prev => ({ ...prev, teams: [...(prev.teams || []), { ...team, id: Date.now().toString(), createdAt: new Date().toISOString() }] }))}
                onDeleteTeam={(id) => setSettings(prev => ({ ...prev, teams: (prev.teams || []).filter(t => t.id !== id) }))}
                onUpdateTeam={(id, updates) => setSettings(prev => ({ ...prev, teams: (prev.teams || []).map(t => t.id === id ? { ...t, ...updates } : t) }))}
                onAssignMemberToTeam={(memberId, teamId) => {
                  setAllUsers(prev => prev.map(u => u.id === memberId ? { ...u, teamId: teamId || undefined } : u));
                }}
              />
            )}
            {activeTab === 'permissions' && currentUser.role === UserRole.ADMIN && (
              <PermissionManager
                lang={lang}
                roles={settings.availableRoles}
                permissions={settings.rolePermissions || {}}
                onPermissionsChange={(newPermissions) => {
                  setSettings(prev => ({ ...prev, rolePermissions: newPermissions }));
                }}
              />
            )}
          </div>
        </main>
      </div>

      {showScanner && (
        <FaceScanner
          onCapture={async (img: string, source: any) => {
            if (img === "BYPASS_AI_EMERGENCY") {
              setShowScanner(false);
              if (pendingAction) await executeAttendanceAction(pendingAction.type, pendingAction.note, pendingAction.workMode);
              return;
            }
            setIsVerifying(true);
            try {
              const res = await verifyFaceLocal(source, currentUser.faceSignature);
              if (res.verified) {
                if (!currentUser.faceSignature) {
                  const u = { ...currentUser, storedFace: img, faceSignature: res.signature };
                  setCurrentUser(u);
                  setAllUsers(prev => prev.map(it => it.id === u.id ? u : it));
                }
                if (pendingAction) await executeAttendanceAction(pendingAction.type, pendingAction.note, pendingAction.workMode);
              } else { setScannerMessage(res.message); setIsVerifying(false); }
            } catch (e) { setScannerMessage("Verification Error"); setIsVerifying(false); }
          }}
          onCancel={() => { setShowScanner(false); setPendingAction(null); }}
          isVerifying={isVerifying}
          statusMessage={scannerMessage}
          challenge={!currentUser.storedFace ? "First-time Registration" : "Please smile"}
          lang={lang}
        />
      )}

      {successModal.show && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2rem] shadow-2xl p-8 max-w-sm w-full animate-in zoom-in-95 duration-300 border-4 border-emerald-500">
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30 animate-in zoom-in duration-500">
                <svg className="w-9 h-9 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight mb-1">
                  {successModal.message.split('!')[0]}
                </h3>
                <p className="text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-widest">
                  {lang === Language.TH ? 'บันทึกข้อมูลเรียบร้อย' : 'Data Saved Successfully'}
                </p>
              </div>
              <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-emerald-500 animate-[shrink_2.5s_linear]" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
};

export default App;
