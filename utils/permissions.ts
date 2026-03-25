import { PermissionKey, RolePermissions } from '../types';

/**
 * ตรวจสอบว่า role มีสิทธิ์เข้าถึง permission นี้หรือไม่
 */
export const hasPermission = (
    role: string,
    permissionKey: PermissionKey,
    rolePermissions?: RolePermissions
): boolean => {
    // ถ้าไม่มี rolePermissions ให้อนุญาตทั้งหมด (backward compatibility)
    if (!rolePermissions) return true;

    // ADMIN มีสิทธิ์ทั้งหมดเสมอ
    if (role === 'ADMIN') return true;

    // ตรวจสอบจาก permission matrix
    const permissions = rolePermissions[role] || getDefaultPermissions(role);
    return permissions.includes(permissionKey);
};

/**
 * Filter menu items ตาม permissions ของ role
 */
export const filterMenuByPermissions = <T extends { id: string }>(
    menuItems: T[],
    role: string,
    rolePermissions?: RolePermissions
): T[] => {
    if (!rolePermissions) return menuItems;
    if (role === 'ADMIN') return menuItems;

    return menuItems.filter(item => {
        const permissionKey = item.id as PermissionKey;
        return hasPermission(role, permissionKey, rolePermissions);
    });
};

/**
 * สร้าง default permissions สำหรับ role ใหม่
 */
export const getDefaultPermissions = (role: string): PermissionKey[] => {
    const roleUpper = role.toUpperCase();

    // ADMIN มีสิทธิ์ทั้งหมด
    if (roleUpper === 'ADMIN') {
        return ['dashboard', 'history', 'insights', 'profile', 'leave', 'organization', 'announcements', 'content', 'calendar', 'payroll', 'admin', 'mkt', 'mkt_edit', 'chat', 'chat_dm', 'permissions', 'teams'];
    }

    // MANAGER มีสิทธิ์ส่วนใหญ่ ยกเว้น admin
    if (roleUpper === 'MANAGER') {
        return ['dashboard', 'history', 'insights', 'profile', 'leave', 'organization', 'announcements', 'content', 'payroll'];
    }

    // EMPLOYEE มีสิทธิ์พื้นฐาน + mkt
    return ['dashboard', 'history', 'profile', 'leave', 'announcements', 'mkt', 'chat'];
};

