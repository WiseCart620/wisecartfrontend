const pad = (n) => String(n).padStart(2, '0');
export const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

// next calendar day after `end`, rolled forward past Sat/Sun to Monday
const nextWeekday = (end) => {
    const d = new Date(end);
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() + 1);
    return d;
};

export const runOptionsFor = (employees) => {
    const bySchedule = new Map();
    employees.forEach(e => {
        if (!e.scheduleId || !e.scheduleFrequency) return;
        const cur = bySchedule.get(e.scheduleId) || { e, count: 0 };
        cur.count += 1;
        bySchedule.set(e.scheduleId, cur);
    });
    const out = [];
    bySchedule.forEach(({ e, count }, id) => {
        const n = `${count} employee${count === 1 ? '' : 's'}`;
        if (e.scheduleFrequency === 'SEMI_MONTHLY') {
            out.push({ value: `${id}|SEMI_15`, scheduleId: id, key: 'SEMI_15', label: `15th (${n})` });
            out.push({ value: `${id}|SEMI_30`, scheduleId: id, key: 'SEMI_30', label: `30th (${n})` });
        } else {
            out.push({ value: `${id}|${e.scheduleFrequency}`, scheduleId: id, key: e.scheduleFrequency, label: `${e.scheduleName} (${n})` });
        }
        if (e.scheduleFrequency !== 'CUSTOM') {
            out.push({
                value: `${id}|CUSTOM_RANGE`, scheduleId: id, key: 'CUSTOM_RANGE',
                label: `Custom dates · ${e.scheduleName} (${n})`,
            });
        }
    });
    return out;
};

export const computePeriod = (key, now = new Date()) => {
    if (key === 'CUSTOM' || key === 'CUSTOM_RANGE') return { periodStart: '', periodEnd: '', payDate: '' };

    const y = now.getFullYear();
    const m = now.getMonth();
    const lastDay = new Date(y, m + 1, 0).getDate();
    let start, end;
    if (key === 'SEMI_15') { start = new Date(y, m, 1); end = new Date(y, m, 15); }
    else if (key === 'SEMI_30') { start = new Date(y, m, 16); end = new Date(y, m, lastDay); }
    else if (key === 'MONTHLY') { start = new Date(y, m, 1); end = new Date(y, m, lastDay); }
    else { // WEEKLY: Monday to Sunday of the current week
        const dow = (now.getDay() + 6) % 7;
        start = new Date(y, m, now.getDate() - dow);
        end = new Date(y, m, now.getDate() - dow + 6);
    }
    return { periodStart: fmtDate(start), periodEnd: fmtDate(end), payDate: fmtDate(nextWeekday(end)) };
};


// same as computePeriod, but for a chosen month (1-12) and year
export const computePeriodFor = (key, month, year) =>
    computePeriod(key, new Date(year, month - 1, 1));