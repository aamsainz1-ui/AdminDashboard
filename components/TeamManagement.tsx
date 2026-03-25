import React, { useState } from 'react';
import { Team, UserProfile, Language } from '../types';

interface TeamManagementProps {
    teams: Team[];
    members: UserProfile[];
    lang: Language;
    onCreateTeam: (team: Omit<Team, 'id' | 'createdAt'>) => void;
    onDeleteTeam: (id: string) => void;
    onUpdateTeam: (id: string, updates: Partial<Team>) => void;
    onAssignMemberToTeam: (memberId: string, teamId: string | null) => void;
    onConfirmAction?: (title: string, message: string, onConfirm: () => void) => void;
}

const TEAM_COLORS = [
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#ec4899', // Pink
    '#f59e0b', // Amber
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#ef4444', // Red
    '#14b8a6', // Teal
];

const TeamManagement: React.FC<TeamManagementProps> = ({
    teams,
    members,
    lang,
    onCreateTeam,
    onDeleteTeam,
    onUpdateTeam,
    onAssignMemberToTeam,
    onConfirmAction
}) => {
    const [showAddTeam, setShowAddTeam] = useState(false);
    const [newTeam, setNewTeam] = useState({
        name: '',
        description: '',
        color: TEAM_COLORS[0],
        memberIds: [] as string[]
    });

    const handleCreateTeam = () => {
        if (!newTeam.name.trim()) {
            alert(lang === Language.TH ? 'กรุณากรอกชื่อทีม' : 'Please enter team name');
            return;
        }
        onCreateTeam(newTeam);
        setNewTeam({ name: '', description: '', color: TEAM_COLORS[0], memberIds: [] });
        setShowAddTeam(false);
    };

    const getTeamMembers = (teamId: string) => {
        return members.filter(m => m.teamId === teamId);
    };

    const getUnassignedMembers = () => {
        return members.filter(m => !m.teamId);
    };

    const t = {
        title: lang === Language.TH ? 'จัดการทีม' : 'Team Management',
        subtitle: lang === Language.TH ? 'จัดการทีมและสมาชิก' : 'Organize Teams & Members',
        addTeam: lang === Language.TH ? '+ สร้างทีมใหม่' : '+ Create Team',
        teamName: lang === Language.TH ? 'ชื่อทีม' : 'Team Name',
        description: lang === Language.TH ? 'คำอธิบาย' : 'Description',
        color: lang === Language.TH ? 'สีทีม' : 'Team Color',
        members: lang === Language.TH ? 'สมาชิก' : 'Members',
        unassigned: lang === Language.TH ? 'ยังไม่ได้จัดทีม' : 'Unassigned',
        cancel: lang === Language.TH ? 'ยกเลิก' : 'Cancel',
        create: lang === Language.TH ? 'สร้างทีม' : 'Create Team',
        delete: lang === Language.TH ? 'ลบทีม' : 'Delete Team',
        noMembers: lang === Language.TH ? 'ยังไม่มีสมาชิก' : 'No members yet',
        assignTo: lang === Language.TH ? 'จัดเข้าทีม' : 'Assign to',
        remove: lang === Language.TH ? 'ลบออก' : 'Remove'
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h2 className="text-3xl font-black text-slate-900 tracking-tight">{t.title}</h2>
                    <p className="text-xs font-black text-indigo-600 uppercase tracking-widest mt-1">{t.subtitle}</p>
                </div>
                <button
                    onClick={() => setShowAddTeam(true)}
                    className="bg-slate-900 text-white px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl"
                >
                    {t.addTeam}
                </button>
            </div>

            {/* Teams Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {teams.map(team => {
                    const teamMembers = getTeamMembers(team.id);
                    return (
                        <div
                            key={team.id}
                            className="bg-white rounded-[2rem] shadow-lg border border-slate-100 overflow-hidden group hover:shadow-xl transition-all"
                        >
                            {/* Team Header */}
                            <div
                                className="p-6 border-b border-slate-100"
                                style={{ backgroundColor: team.color + '15' }}
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex-1">
                                        <div className="flex items-center space-x-3 mb-2">
                                            <div
                                                className="w-4 h-4 rounded-full"
                                                style={{ backgroundColor: team.color }}
                                            />
                                            <h3 className="text-lg font-black text-slate-900">{team.name}</h3>
                                        </div>
                                        {team.description && (
                                            <p className="text-xs text-slate-500 font-medium">{team.description}</p>
                                        )}
                                    </div>
                                    <button
                                        onClick={() => {
                                            const msg = lang === Language.TH ? `ต้องการลบทีม "${team.name}" ใช่หรือไม่?` : `Delete team "${team.name}"?`;
                                            if (onConfirmAction) onConfirmAction(lang === Language.TH ? 'ลบทีม' : 'Delete Team', msg, () => onDeleteTeam(team.id));
                                            else if (confirm(msg)) onDeleteTeam(team.id);
                                        }}
                                        className="p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                        title={t.delete}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                                <div className="mt-3 flex items-center space-x-2">
                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                        {teamMembers.length} {t.members}
                                    </span>
                                </div>
                            </div>

                            {/* Team Members */}
                            <div className="p-4 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                                {teamMembers.length === 0 ? (
                                    <p className="text-center text-xs text-slate-400 italic py-4">{t.noMembers}</p>
                                ) : (
                                    teamMembers.map(member => (
                                        <div
                                            key={member.id}
                                            className="flex items-center justify-between p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors group/member"
                                        >
                                            <div className="flex items-center space-x-3">
                                                <div
                                                    className="w-8 h-8 rounded-full flex items-center justify-center text-white font-black text-xs"
                                                    style={{ backgroundColor: team.color }}
                                                >
                                                    {member.name[0]}
                                                </div>
                                                <div>
                                                    <p className="text-xs font-black text-slate-900">{member.name}</p>
                                                    <p className="text-[10px] text-slate-400 font-medium">{member.position}</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => {
                                                    const msg = lang === Language.TH ? `ต้องการลบ ${member.name} ออกจากทีม ${team.name}?` : `Remove ${member.name} from ${team.name}?`;
                                                    if (onConfirmAction) onConfirmAction(lang === Language.TH ? 'นำออกจากทีม' : 'Remove Member', msg, () => onAssignMemberToTeam(member.id, null));
                                                    else if (confirm(msg)) onAssignMemberToTeam(member.id, null);
                                                }}
                                                className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover/member:opacity-100 transition-all"
                                                title={t.remove}
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}

                {/* Unassigned Members Card */}
                <div className="bg-slate-50 rounded-[2rem] border-2 border-dashed border-slate-200 overflow-hidden">
                    <div className="p-6 border-b border-slate-200 bg-white">
                        <h3 className="text-lg font-black text-slate-600">{t.unassigned}</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">
                            {getUnassignedMembers().length} {t.members}
                        </p>
                    </div>
                    <div className="p-4 space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
                        {getUnassignedMembers().map(member => (
                            <div
                                key={member.id}
                                className="flex items-center justify-between p-3 bg-white rounded-xl border border-slate-200 hover:border-indigo-300 transition-colors"
                            >
                                <div className="flex items-center space-x-3">
                                    <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-slate-600 font-black text-xs">
                                        {member.name[0]}
                                    </div>
                                    <div>
                                        <p className="text-xs font-black text-slate-900">{member.name}</p>
                                        <p className="text-[10px] text-slate-400 font-medium">{member.position}</p>
                                    </div>
                                </div>
                                <select
                                    onChange={(e) => {
                                        if (e.target.value) {
                                            onAssignMemberToTeam(member.id, e.target.value);
                                        }
                                    }}
                                    className="text-[10px] font-black px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg border border-indigo-200 outline-none hover:bg-indigo-100 transition-colors"
                                    defaultValue=""
                                    title={t.assignTo}
                                >
                                    <option value="" disabled>{t.assignTo}</option>
                                    {teams.map(team => (
                                        <option key={team.id} value={team.id}>{team.name}</option>
                                    ))}
                                </select>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Add Team Modal */}
            {showAddTeam && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[200] flex items-center justify-center p-6">
                    <div className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 animate-in zoom-in-95 duration-200">
                        <h3 className="text-2xl font-black text-slate-900 tracking-tight mb-8">{t.addTeam}</h3>
                        <div className="space-y-6">
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    {t.teamName}
                                </label>
                                <input
                                    type="text"
                                    value={newTeam.name}
                                    onChange={(e) => setNewTeam({ ...newTeam, name: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                    placeholder={lang === Language.TH ? 'เช่น ทีมการตลาด' : 'e.g. Marketing Team'}
                                    title={t.teamName}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    {t.description}
                                </label>
                                <textarea
                                    value={newTeam.description}
                                    onChange={(e) => setNewTeam({ ...newTeam, description: e.target.value })}
                                    className="w-full px-5 py-4 bg-slate-50 border border-slate-100 rounded-2xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[80px]"
                                    placeholder={lang === Language.TH ? 'คำอธิบายทีม (ไม่บังคับ)' : 'Team description (optional)'}
                                    title={t.description}
                                />
                            </div>
                            <div>
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">
                                    {t.color}
                                </label>
                                <div className="grid grid-cols-8 gap-2">
                                    {TEAM_COLORS.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setNewTeam({ ...newTeam, color })}
                                            className={`w-10 h-10 rounded-xl transition-all ${newTeam.color === color
                                                ? 'ring-4 ring-offset-2 ring-indigo-500 scale-110'
                                                : 'hover:scale-105'
                                                }`}
                                            style={{ backgroundColor: color }}
                                            title={color}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="flex space-x-4 pt-4">
                                <button
                                    onClick={() => {
                                        setShowAddTeam(false);
                                        setNewTeam({ name: '', description: '', color: TEAM_COLORS[0], memberIds: [] });
                                    }}
                                    className="flex-1 py-4 bg-slate-100 text-slate-600 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-200 transition-all"
                                >
                                    {t.cancel}
                                </button>
                                <button
                                    onClick={handleCreateTeam}
                                    className="flex-1 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
                                >
                                    {t.create}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TeamManagement;

