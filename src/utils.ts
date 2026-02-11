/**
 * Gera um ID único estilo UUID (ou similar se o ambiente não suportar crypto.randomUUID)
 */
export const generateId = (): string => {
    try {
        return crypto.randomUUID();
    } catch (e) {
        return Date.now().toString(36) + Math.random().toString(36).substring(2);
    }
};

/**
 * Formata uma data para o padrão pt-BR com dia, mês, ano, hora e minuto
 */
export const formatDate = (dateStr?: string | null): string => {
    if (!dateStr) return '--/--';
    try {
        const d = new Date(dateStr);
        return d.toLocaleString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (e) {
        return '--/--';
    }
};

/**
 * Formata segundos em HH:MM:SS
 */
export const formatSeconds = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/**
 * Formata segundos de forma amigável (ex: 1h 2m 3s)
 */
export const formatDuration = (totalSeconds: number): string => {
    const h = Math.floor(totalSeconds / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;
    const parts = [];
    if (h > 0) parts.push(`${h}h`);
    if (m > 0 || h > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);
    return parts.join(' ');
};
