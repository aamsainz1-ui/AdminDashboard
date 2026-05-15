import React, { useState, useEffect } from 'react';
import { Permission, PermissionKey, RolePermissions, Language } from '../types';

interface PermissionManagerProps {
    lang: Language;
    roles: string[];
    permissions: RolePermissions;
    onPermissionsChange: (permissions: RolePermissions) => void;
}

// รายการฟังก์ชันสำหรับ Admin Dashboard เท่านั้น
const ALL_PERMISSIONS: Permission[] = [
    { key: 'payroll', label: 'Payroll System', labelTH: 'ระบบเงินเดือน', icon: '💰' },
    { key: 'announcements', label: 'Announcements', labelTH: 'ประกาศ', icon: '📢' },
    { key: 'organization', label: 'Employee Management', labelTH: 'จัดการพนักงาน', icon: '👥' },
    { key: 'leave', label: 'Leave Management', labelTH: 'จัดการวันลา', icon: '🏖️' },
    { key: 'history', label: 'Leave History', labelTH: 'ประวัติการลา', icon: '📅' },
    { key: 'permissions', label: 'Permissions', labelTH: 'จัดการสิทธิ์', icon: '🔐' },
    { key: 'tasks', label: 'Tasks', labelTH: 'งาน', icon: '✅' },
    { key: 'admin', label: 'System Settings', labelTH: 'ตั้งค่าระบบ', icon: '⚙️' },
    { key: 'penalty', label: 'Penalty Report', labelTH: 'รายงานข้อผิดพลาด/ค่าปรับ', icon: '⚠️' },
    { key: 'chat', label: 'Chat', labelTH: 'แชท', icon: '💬' },
];

const PermissionManager: React.FC<PermissionManagerProps> = ({
    lang,
    roles,
    permissions,
    onPermissionsChange
}) => {
    const [localPermissions, setLocalPermissions] = useState<RolePermissions>(permissions);

    useEffect(() => {
        setLocalPermissions(permissions);
    }, [permissions]);

    const handleTogglePermission = (role: string, permissionKey: PermissionKey) => {
        const currentPerms = localPermissions[role] || [];
        const hasPermission = currentPerms.includes(permissionKey);

        const updatedPerms = hasPermission
            ? currentPerms.filter(p => p !== permissionKey)
            : [...currentPerms, permissionKey];

        const newPermissions = {
            ...localPermissions,
            [role]: updatedPerms
        };

        setLocalPermissions(newPermissions);
        onPermissionsChange(newPermissions); // Save ทันทีเมื่อมีการเปลี่ยนแปลง
    };

    const hasPermission = (role: string, permissionKey: PermissionKey): boolean => {
        return (localPermissions[role] || []).includes(permissionKey);
    };

    const toggleAllForRole = (role: string, enable: boolean) => {
        const newPermissions = {
            ...localPermissions,
            [role]: enable ? ALL_PERMISSIONS.map(p => p.key) : []
        };
        setLocalPermissions(newPermissions);
        onPermissionsChange(newPermissions);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-black text-slate-900 tracking-tight">
                        {lang === Language.TH ? '🔐 จัดการสิทธิ์การใช้งาน' : '🔐 Permission Management'}
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">
                        {lang === Language.TH
                            ? 'กำหนดสิทธิ์การเข้าถึงฟังก์ชันต่างๆ สำหรับแต่ละตำแหน่ง'
                            : 'Configure access permissions for each role'}
                    </p>
                </div>
            </div>

            {/* Permission Matrix Table */}
            <div className="bg-white rounded-[2rem] shadow-soft border border-slate-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-left">
                                    <div className="flex items-center gap-2">
                                        <span className="text-lg">📋</span>
                                        <span className="font-black text-slate-900 text-sm">
                                            {lang === Language.TH ? 'ฟังก์ชัน' : 'Function'}
                                        </span>
                                    </div>
                                </th>
                                {roles.map(role => (
                                    <th key={role} className="px-6 py-4 text-center min-w-[140px]">
                                        <div className="flex flex-col items-center gap-2">
                                            <span className="font-black text-slate-900 text-sm uppercase tracking-wide">
                                                {role}
                                            </span>
                                            <div className="flex gap-1">
                                                <button
                                                    onClick={() => toggleAllForRole(role, true)}
                                                    className="px-2 py-1 text-[10px] font-bold bg-emerald-100 text-emerald-700 rounded-lg hover:bg-emerald-200 transition-all"
                                                    title={lang === Language.TH ? 'เลือกทั้งหมด' : 'Select All'}
                                                >
                                                    {lang === Language.TH ? 'ทั้งหมด' : 'All'}
                                                </button>
                                                <button
                                                    onClick={() => toggleAllForRole(role, false)}
                                                    className="px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-all"
                                                    title={lang === Language.TH ? 'ยกเลิกทั้งหมด' : 'Clear All'}
                                                >
                                                    {lang === Language.TH ? 'ล้าง' : 'Clear'}
                                                </button>
                                            </div>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {ALL_PERMISSIONS.map((permission, index) => (
                                <tr
                                    key={permission.key}
                                    className={`border-b border-slate-100 hover:bg-slate-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'
                                        }`}
                                >
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">{permission.icon}</span>
                                            <div>
                                                <div className="font-bold text-slate-900 text-sm">
                                                    {lang === Language.TH ? permission.labelTH : permission.label}
                                                </div>
                                                <div className="text-xs text-slate-500 font-mono">
                                                    {permission.key}
                                                </div>
                                            </div>
                                        </div>
                                    </td>
                                    {roles.map(role => (
                                        <td key={`${role}-${permission.key}`} className="px-6 py-4 text-center">
                                            <label className="inline-flex items-center justify-center cursor-pointer group">
                                                <input
                                                    type="checkbox"
                                                    checked={hasPermission(role, permission.key)}
                                                    onChange={() => handleTogglePermission(role, permission.key)}
                                                    className="sr-only peer"
                                                />
                                                <div className="relative w-12 h-12 bg-slate-100 rounded-lg peer-checked:bg-gradient-to-br peer-checked:from-emerald-400 peer-checked:to-teal-500 transition-all duration-300 shadow-soft hover:shadow-lg hover:scale-105 flex items-center justify-center">
                                                    {hasPermission(role, permission.key) ? (
                                                        <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                        </svg>
                                                    ) : (
                                                        <svg className="w-6 h-6 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                        </svg>
                                                    )}
                                                </div>
                                            </label>
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {roles.map(role => {
                    const rolePerms = localPermissions[role] || [];
                    const percentage = Math.round((rolePerms.length / ALL_PERMISSIONS.length) * 100);

                    return (
                        <div key={role} className="bg-gradient-to-br from-white to-slate-50 rounded-[1.5rem] shadow-soft border border-slate-200 p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="font-black text-slate-900 uppercase tracking-wide text-sm">
                                    {role}
                                </h3>
                                <span className="text-2xl font-black text-indigo-600">
                                    {percentage}%
                                </span>
                            </div>
                            <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500 rounded-full"
                                    style={{ width: `${percentage}%` }}
                                />
                            </div>
                            <p className="text-xs text-slate-600 mt-3 font-semibold">
                                {rolePerms.length} / {ALL_PERMISSIONS.length} {lang === Language.TH ? 'ฟังก์ชัน' : 'functions'}
                            </p>
                        </div>
                    );
                })}
            </div>

            {/* Auto-save indicator */}
            <div className="flex items-center justify-center gap-2 text-xs text-slate-500">
                <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
                <span className="font-semibold">
                    {lang === Language.TH ? 'บันทึกอัตโนมัติ' : 'Auto-saved'}
                </span>
            </div>
        </div>
    );
};

export default PermissionManager;

