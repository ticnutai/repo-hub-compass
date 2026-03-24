export type ProjectStatus = 'active' | 'paused' | 'completed';
export type Platform = 'github' | 'local';

export interface Project {
  id: string;
  name: string;
  description: string;
  platform: Platform;
  language: string;
  status: ProjectStatus;
  category: string;
  tags: string[];
  repoUrl?: string;
  localPath?: string;
  lastUpdated: string;
  createdAt: string;
}

export interface Account {
  id: string;
  serviceName: string;
  serviceType: string;
  username: string;
  email: string;
  password: string;
  apiKey?: string;
  notes: string;
  linkedProjects: string[];
}

export interface ChangeLog {
  id: string;
  projectId: string;
  projectName: string;
  description: string;
  date: string;
  type: 'feature' | 'fix' | 'update' | 'deploy';
}

export interface Backup {
  id: string;
  projectId: string;
  projectName: string;
  date: string;
  size: string;
  status: 'success' | 'failed' | 'pending';
  type: 'auto' | 'manual';
}

export const mockProjects: Project[] = [
  {
    id: '1', name: 'DevHub Manager', description: 'מנהל פרויקטים מרכזי לכל הפרויקטים שלי',
    platform: 'github', language: 'TypeScript', status: 'active', category: 'כלים',
    tags: ['React', 'Supabase'], repoUrl: 'https://github.com/user/devhub',
    lastUpdated: '2026-03-24', createdAt: '2026-01-15',
  },
  {
    id: '2', name: 'E-Commerce Store', description: 'חנות אונליין עם מערכת תשלומים',
    platform: 'github', language: 'TypeScript', status: 'active', category: 'אתרים',
    tags: ['Next.js', 'Stripe'], repoUrl: 'https://github.com/user/ecommerce',
    lastUpdated: '2026-03-22', createdAt: '2025-11-01',
  },
  {
    id: '3', name: 'Portfolio Website', description: 'אתר תיק עבודות אישי',
    platform: 'local', language: 'HTML/CSS', status: 'completed', category: 'אתרים',
    tags: ['Tailwind', 'Vite'], localPath: '/projects/portfolio',
    lastUpdated: '2026-02-10', createdAt: '2025-06-20',
  },
  {
    id: '4', name: 'Task Automation', description: 'סקריפטים לאוטומציה של משימות יומיות',
    platform: 'local', language: 'Python', status: 'paused', category: 'כלים',
    tags: ['Python', 'Automation'], localPath: '/projects/automation',
    lastUpdated: '2026-01-05', createdAt: '2025-09-12',
  },
  {
    id: '5', name: 'Mobile App API', description: 'API לאפליקציית מובייל',
    platform: 'github', language: 'Node.js', status: 'active', category: 'API',
    tags: ['Express', 'MongoDB'], repoUrl: 'https://github.com/user/mobile-api',
    lastUpdated: '2026-03-20', createdAt: '2025-08-03',
  },
  {
    id: '6', name: 'Blog Platform', description: 'פלטפורמת בלוג מותאמת אישית',
    platform: 'github', language: 'TypeScript', status: 'active', category: 'אתרים',
    tags: ['React', 'MDX'], repoUrl: 'https://github.com/user/blog',
    lastUpdated: '2026-03-18', createdAt: '2025-12-01',
  },
];

export const mockAccounts: Account[] = [
  {
    id: '1', serviceName: 'GitHub', serviceType: 'קוד', username: 'devuser',
    email: 'dev@example.com', password: 'gh_token_xxx', apiKey: 'ghp_xxxxxxxxxxxx',
    notes: 'חשבון ראשי', linkedProjects: ['1', '2', '5', '6'],
  },
  {
    id: '2', serviceName: 'Vercel', serviceType: 'אחסון', username: 'devuser',
    email: 'dev@example.com', password: 'vercel_pass', notes: 'דיפלוי אוטומטי',
    linkedProjects: ['2', '3'],
  },
  {
    id: '3', serviceName: 'Namecheap', serviceType: 'דומיינים', username: 'devuser',
    email: 'dev@example.com', password: 'nc_pass', notes: '3 דומיינים פעילים',
    linkedProjects: ['2', '3'],
  },
];

export const mockChangeLogs: ChangeLog[] = [
  { id: '1', projectId: '1', projectName: 'DevHub Manager', description: 'הוספת דשבורד מרכזי', date: '2026-03-24', type: 'feature' },
  { id: '2', projectId: '2', projectName: 'E-Commerce Store', description: 'תיקון באג בעגלת קניות', date: '2026-03-22', type: 'fix' },
  { id: '3', projectId: '5', projectName: 'Mobile App API', description: 'עדכון אבטחת JWT', date: '2026-03-20', type: 'update' },
  { id: '4', projectId: '6', projectName: 'Blog Platform', description: 'דיפלוי גרסה 2.0', date: '2026-03-18', type: 'deploy' },
  { id: '5', projectId: '1', projectName: 'DevHub Manager', description: 'הוספת ניהול חשבונות', date: '2026-03-17', type: 'feature' },
  { id: '6', projectId: '2', projectName: 'E-Commerce Store', description: 'שיפור ביצועים', date: '2026-03-15', type: 'update' },
];

export const mockBackups: Backup[] = [
  { id: '1', projectId: '1', projectName: 'DevHub Manager', date: '2026-03-24', size: '45 MB', status: 'success', type: 'auto' },
  { id: '2', projectId: '2', projectName: 'E-Commerce Store', date: '2026-03-23', size: '120 MB', status: 'success', type: 'auto' },
  { id: '3', projectId: '5', projectName: 'Mobile App API', date: '2026-03-22', size: '78 MB', status: 'failed', type: 'auto' },
  { id: '4', projectId: '3', projectName: 'Portfolio Website', date: '2026-03-20', size: '15 MB', status: 'success', type: 'manual' },
  { id: '5', projectId: '6', projectName: 'Blog Platform', date: '2026-03-19', size: '92 MB', status: 'success', type: 'auto' },
];

export const statusLabels: Record<ProjectStatus, string> = {
  active: 'פעיל',
  paused: 'מושהה',
  completed: 'הושלם',
};

export const platformLabels: Record<Platform, string> = {
  github: 'GitHub',
  local: 'מקומי',
};

export const changeTypeLabels: Record<ChangeLog['type'], string> = {
  feature: 'פיצ\'ר חדש',
  fix: 'תיקון',
  update: 'עדכון',
  deploy: 'דיפלוי',
};
