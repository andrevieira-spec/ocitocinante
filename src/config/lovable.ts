const raw = import.meta.env.VITE_ENABLE_LOVABLE?.toString().toLowerCase();

export const lovableEnabled = raw === 'true' || raw === '1' || raw === 'yes';
