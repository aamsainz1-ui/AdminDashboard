import { supabase, isOnline } from './supabase';
import { UserProfile, AttendanceRecord, LeaveRecord, Announcement, ContentPlan, PayrollRecord, CompensationSettings, DailySummaryRecord, SystemSettings } from '../types';

// ==================== SYNC FUNCTIONS ====================

export const syncUsers = async (localUsers: UserProfile[]): Promise<UserProfile[]> => {
    if (!isOnline || !supabase) return localUsers;

    try {
        // STEP 1: Fetch all users from Supabase (cloud is source of truth)
        const { data: cloudUsers, error: fetchError } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: true });

        if (fetchError) throw fetchError;

        const cloudUserIds = new Set((cloudUsers || []).map((u: any) => u.id));

        // STEP 2: Upload only NEW local users (not in cloud) or UPDATE existing ones
        for (const user of localUsers) {
            // Skip if user was deleted from cloud (not in cloudUserIds)
            // Only upsert if user exists in cloud OR is a brand new user
            const isNewUser = !cloudUserIds.has(user.id);

            if (isNewUser && user.name) {
                const { error } = await supabase
                    .from('users')
                    .upsert({
                        id: user.id,
                        name: user.name,
                        position: user.position,
                        department: user.department,
                        employee_id: user.employeeId,
                        join_date: user.joinDate,
                        company: user.company,
                        avatar: user.avatar,
                        role: user.role,
                        pin: user.pin,
                        stored_face: user.storedFace,
                        face_signature: user.faceSignature,
                        leave_balances: user.leaveBalances,
                        updated_at: new Date().toISOString()
                    }, { onConflict: 'id' });

                if (error) console.error('Error syncing user:', error);
            }
        }

        // STEP 3: Fetch again to get the final state
        const { data: finalData, error: finalError } = await supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: true });

        if (finalError) throw finalError;

        // Convert to UserProfile format
        const syncedUsers: UserProfile[] = (finalData || []).map((u: any) => ({
            id: u.id,
            name: u.name,
            position: u.position,
            department: u.department,
            employeeId: u.employee_id,
            joinDate: u.join_date,
            company: u.company,
            avatar: u.avatar,
            role: u.role,
            pin: u.pin,
            storedFace: u.stored_face,
            faceSignature: u.face_signature,
            leaveBalances: u.leave_balances
        }));

        console.log(`🔄 Synced ${syncedUsers.length} users (cloud-first)`);
        return syncedUsers;
    } catch (error) {
        console.error('Sync users error:', error);
        return localUsers;
    }
};

export const syncAttendance = async (userId: string, localRecords: AttendanceRecord[]): Promise<AttendanceRecord[]> => {
    if (!isOnline || !supabase) return localRecords;

    try {
        // Upload local records
        for (const record of localRecords) {
            const { error } = await supabase
                .from('attendance_records')
                .upsert({
                    id: record.id,
                    user_id: userId,
                    type: record.type,
                    work_mode: record.workMode,
                    timestamp: record.timestamp,
                    timezone: record.timezone,
                    notes: record.notes,
                    location: record.location
                }, { onConflict: 'id' });

            if (error) console.error('Error syncing attendance:', error);
        }

        // Fetch all records for this user
        const { data, error } = await supabase
            .from('attendance_records')
            .select('*')
            .eq('user_id', userId)
            .order('timestamp', { ascending: false });

        if (error) throw error;

        const syncedRecords: AttendanceRecord[] = (data || []).map((r: any) => ({
            id: r.id,
            type: r.type,
            workMode: r.work_mode,
            timestamp: r.timestamp,
            timezone: r.timezone,
            notes: r.notes,
            location: r.location
        }));

        return syncedRecords;
    } catch (error) {
        console.error('Sync attendance error:', error);
        return localRecords;
    }
};

export const syncLeaves = async (localLeaves: LeaveRecord[]): Promise<LeaveRecord[]> => {
    if (!isOnline || !supabase) return localLeaves;

    try {
        for (const leave of localLeaves) {
            const { error } = await supabase
                .from('leave_records')
                .upsert({
                    id: leave.id,
                    employee_id: leave.employeeId,
                    employee_name: leave.employeeName,
                    type: leave.type,
                    start_date: leave.startDate,
                    end_date: leave.endDate,
                    reason: leave.reason,
                    status: leave.status
                }, { onConflict: 'id' });

            if (error) console.error('Error syncing leave:', error);
        }

        const { data, error } = await supabase
            .from('leave_records')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        return (data || []).map((l: any) => ({
            id: l.id,
            employeeId: l.employee_id,
            employeeName: l.employee_name,
            type: l.type,
            startDate: l.start_date,
            endDate: l.end_date,
            reason: l.reason,
            status: l.status,
            requestedAt: Date.now() // Default to now if not stored
        }));
    } catch (error) {
        console.error('Sync leaves error:', error);
        return localLeaves;
    }
};

export const syncAnnouncements = async (localAnnouncements: Announcement[]): Promise<Announcement[]> => {
    if (!isOnline || !supabase) return localAnnouncements;

    try {
        // STEP 1: Fetch from cloud first (source of truth)
        const { data: cloudData, error: fetchError } = await supabase
            .from('announcements')
            .select('*')
            .order('date', { ascending: false });

        if (fetchError) throw fetchError;

        const cloudIds = new Set((cloudData || []).map((a: any) => a.id));

        // STEP 2: Only upsert items that exist in cloud or are new
        for (const announcement of localAnnouncements) {
            const isNew = !cloudIds.has(announcement.id);

            if (isNew) {
                const { error } = await supabase
                    .from('announcements')
                    .upsert({
                        id: announcement.id,
                        title: announcement.title,
                        content: announcement.content,
                        date: announcement.date,
                        author: announcement.author,
                        category: announcement.category
                    }, { onConflict: 'id' });

                if (error) console.error('Error syncing announcement:', error);
            }
        }

        // STEP 3: Fetch final state
        const { data: finalData, error: finalError } = await supabase
            .from('announcements')
            .select('*')
            .order('date', { ascending: false });

        if (finalError) throw finalError;

        console.log(`🔄 Synced ${(finalData || []).length} announcements (cloud-first)`);
        return (finalData || []).map((a: any) => ({
            id: a.id,
            title: a.title,
            content: a.content,
            date: a.date,
            author: a.author,
            category: a.category
        }));
    } catch (error) {
        console.error('Sync announcements error:', error);
        return localAnnouncements;
    }
};

export const syncContentPlans = async (localPlans: ContentPlan[]): Promise<ContentPlan[]> => {
    if (!isOnline || !supabase) return localPlans;

    try {
        // STEP 1: Fetch from cloud first
        const { data: cloudData, error: fetchError } = await supabase
            .from('content_plans')
            .select('*')
            .order('scheduled_date', { ascending: true });

        if (fetchError) throw fetchError;

        const cloudIds = new Set((cloudData || []).map((p: any) => p.id));

        // STEP 2: Only upsert items that exist in cloud or are new
        for (const plan of localPlans) {
            const isNew = !cloudIds.has(plan.id);

            if (isNew) {
                const { error } = await supabase
                    .from('content_plans')
                    .upsert({
                        id: plan.id,
                        title: plan.title,
                        description: plan.description,
                        platform: plan.platform,
                        scheduled_date: plan.scheduledDate,
                        status: plan.status,
                        author: plan.author,
                        image_url: plan.imageUrl
                    }, { onConflict: 'id' });

                if (error) console.error('Error syncing content plan:', error);
            }
        }

        // STEP 3: Fetch final state
        const { data: finalData, error: finalError } = await supabase
            .from('content_plans')
            .select('*')
            .order('scheduled_date', { ascending: true });

        if (finalError) throw finalError;

        console.log(`🔄 Synced ${(finalData || []).length} content plans (cloud-first)`);
        return (finalData || []).map((p: any) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            platform: p.platform,
            scheduledDate: p.scheduled_date,
            status: p.status,
            author: p.author,
            imageUrl: p.image_url
        }));
    } catch (error) {
        console.error('Sync content plans error:', error);
        return localPlans;
    }
};

export const syncPayroll = async (localRecords: PayrollRecord[]): Promise<PayrollRecord[]> => {
    if (!isOnline || !supabase) return localRecords;

    try {
        for (const record of localRecords) {
            const { error } = await supabase
                .from('payroll_records')
                .upsert({
                    id: record.id,
                    employee_id: record.employeeId,
                    month: record.month,
                    base_salary: record.baseSalary,
                    commission: record.commission,
                    bonus: record.bonus,
                    deductions: record.deductions,
                    net_payable: record.netPayable,
                    status: record.status,
                    payment_date: record.paymentDate,
                    notes: record.notes
                }, { onConflict: 'id' });

            if (error) console.error('Error syncing payroll:', error);
        }

        const { data, error } = await supabase
            .from('payroll_records')
            .select('*')
            .order('month', { ascending: false });

        if (error) throw error;

        return (data || []).map((p: any) => ({
            id: p.id,
            employeeId: p.employee_id,
            month: p.month,
            baseSalary: p.base_salary,
            commission: p.commission,
            bonus: p.bonus,
            deductions: p.deductions,
            netPayable: p.net_payable,
            status: p.status,
            paymentDate: p.payment_date,
            notes: p.notes
        }));
    } catch (error) {
        console.error('Sync payroll error:', error);
        return localRecords;
    }
};

export const syncCompensation = async (localSettings: CompensationSettings[]): Promise<CompensationSettings[]> => {
    if (!isOnline || !supabase) return localSettings;

    try {
        for (const setting of localSettings) {
            const { error } = await supabase
                .from('compensation_settings')
                .upsert({
                    id: setting.id,
                    employee_id: setting.employeeId,
                    base_salary: setting.baseSalary,
                    commission_rate: setting.commissionRate,
                    allowances: setting.allowances,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'id' });

            if (error) console.error('Error syncing compensation:', error);
        }

        const { data, error } = await supabase
            .from('compensation_settings')
            .select('*');

        if (error) throw error;

        return (data || []).map((c: any) => ({
            id: c.id,
            employeeId: c.employee_id,
            baseSalary: c.base_salary,
            commissionRate: c.commission_rate,
            allowances: c.allowances
        }));
    } catch (error) {
        console.error('Sync compensation error:', error);
        return localSettings;
    }
};

export const syncDailySummaries = async (localSummaries: DailySummaryRecord[]): Promise<DailySummaryRecord[]> => {
    if (!isOnline || !supabase) return localSummaries;

    try {
        // STEP 1: Fetch from cloud first
        const { data: cloudData, error: fetchError } = await supabase
            .from('daily_summaries')
            .select('*')
            .order('date', { ascending: false });

        if (fetchError) throw fetchError;

        const cloudIds = new Set((cloudData || []).map((s: any) => s.id));

        // STEP 2: Only upsert items that exist in cloud or are new
        for (const summary of localSummaries) {
            const isNew = !cloudIds.has(summary.id);

            if (isNew) {
                const { error } = await supabase
                    .from('daily_summaries')
                    .upsert({
                        id: summary.id,
                        employee_id: summary.employeeId,
                        date: summary.date,
                        fb: summary.fb,
                        google: summary.google,
                        tiktok: summary.tiktok,
                        registrations: summary.registrations,
                        depositors: summary.depositors,
                        first_deposit: summary.firstDeposit,
                        full_day_deposit: summary.fullDayDeposit,
                        full_month_deposit: summary.fullMonthDeposit
                    }, { onConflict: 'id' });

                if (error) console.error('Error syncing summary:', error);
            }
        }

        // STEP 3: Fetch final state
        const { data: finalData, error: finalError } = await supabase
            .from('daily_summaries')
            .select('*')
            .order('date', { ascending: false });

        if (finalError) throw finalError;

        console.log(`🔄 Synced ${(finalData || []).length} daily summaries (cloud-first)`);
        return (finalData || []).map((s: any) => ({
            id: s.id,
            employeeId: s.employee_id,
            date: s.date,
            fb: s.fb || 0,
            google: s.google || 0,
            tiktok: s.tiktok || 0,
            registrations: s.registrations || 0,
            depositors: s.depositors || 0,
            firstDeposit: s.first_deposit || 0,
            fullDayDeposit: s.full_day_deposit || 0,
            fullMonthDeposit: s.full_month_deposit || 0
        }));
    } catch (error) {
        console.error('Sync daily summaries error:', error);
        return localSummaries;
    }
};

export const syncSettings = async (localSettings: SystemSettings): Promise<SystemSettings> => {
    if (!isOnline || !supabase) return localSettings;

    try {
        const { error } = await supabase
            .from('system_settings')
            .upsert({
                id: 'global',
                late_threshold_minute: localSettings.lateThresholdMinute,
                office_locations: localSettings.officeLocations,
                available_roles: localSettings.availableRoles,
                work_start_times: localSettings.workStartTimes,
                role_permissions: localSettings.rolePermissions || {},
                teams: localSettings.teams || [],
                enable_geofencing: localSettings.enableGeofencing !== undefined ? localSettings.enableGeofencing : true,
                mkt_view_permissions: localSettings.mktViewPermissions || {},
                updated_at: new Date().toISOString()
            }, { onConflict: 'id' });

        if (error) console.error('Error syncing settings:', error);

        const { data, error: fetchError } = await supabase
            .from('system_settings')
            .select('*')
            .eq('id', 'global')
            .single();

        if (fetchError) throw fetchError;

        if (data) {
            return {
                lateThresholdMinute: data.late_threshold_minute,
                officeLocations: data.office_locations || [],
                availableRoles: data.available_roles || [],
                workStartTimes: data.work_start_times || ['09:00'],
                rolePermissions: data.role_permissions || {},
                teams: data.teams || [],
                enableGeofencing: data.enable_geofencing !== undefined ? data.enable_geofencing : true,
                mktViewPermissions: data.mkt_view_permissions || {}
            };
        }

        return localSettings;
    } catch (error) {
        console.error('Sync settings error:', error);
        return localSettings;
    }
};

// ==================== DELETE FUNCTIONS ====================

export const deleteUser = async (userId: string): Promise<boolean> => {
    if (!isOnline || !supabase) return false;

    try {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', userId);

        if (error) {
            console.error('Error deleting user:', error);
            return false;
        }

        console.log(`✅ User ${userId} deleted from Supabase`);
        return true;
    } catch (error) {
        console.error('Delete user error:', error);
        return false;
    }
};

export const deleteDailySummary = async (summaryId: string): Promise<boolean> => {
    if (!isOnline || !supabase) return false;

    try {
        const { error } = await supabase
            .from('daily_summaries')
            .delete()
            .eq('id', summaryId);

        if (error) {
            console.error('Error deleting summary:', error);
            return false;
        }

        console.log(`✅ Summary ${summaryId} deleted from Supabase`);
        return true;
    } catch (error) {
        console.error('Delete summary error:', error);
        return false;
    }
};

export const deleteAnnouncement = async (announcementId: string): Promise<boolean> => {
    if (!isOnline || !supabase) return false;

    try {
        const { error } = await supabase
            .from('announcements')
            .delete()
            .eq('id', announcementId);

        if (error) {
            console.error('Error deleting announcement:', error);
            return false;
        }

        console.log(`✅ Announcement ${announcementId} deleted from Supabase`);
        return true;
    } catch (error) {
        console.error('Delete announcement error:', error);
        return false;
    }
};

export const deleteContentPlan = async (planId: string): Promise<boolean> => {
    if (!isOnline || !supabase) return false;

    try {
        const { error } = await supabase
            .from('content_plans')
            .delete()
            .eq('id', planId);

        if (error) {
            console.error('Error deleting content plan:', error);
            return false;
        }

        console.log(`✅ Content plan ${planId} deleted from Supabase`);
        return true;
    } catch (error) {
        console.error('Delete content plan error:', error);
        return false;
    }
};

