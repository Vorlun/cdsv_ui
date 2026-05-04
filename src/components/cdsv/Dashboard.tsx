import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertTriangle,
  Ban,
  Check,
  Eye,
  Lock,
  Shield,
  TrendingUp,
  Upload,
  Users,
  CheckCircle2,
  X,
} from 'lucide-react';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { cn } from '../shadcn/utils';
import ThreatDrawer from '../ThreatDrawer';

type KPIKey = 'uploads' | 'users' | 'blocked' | 'threats';
type DashboardState = 'loading' | 'ready' | 'error' | 'empty';
type ThreatSeverity = 'danger' | 'warning' | 'safe';
type ThreatStatus = 'active' | 'resolved';

interface Threat {
  id: number;
  type: string;
  file: string;
  severity: ThreatSeverity;
  status: ThreatStatus;
  time: string;
  ip: string;
  description: string;
}

const activityData = [
  { time: '00:00', uploads: 12, threats: 2 },
  { time: '04:00', uploads: 8, threats: 1 },
  { time: '08:00', uploads: 45, threats: 5 },
  { time: '12:00', uploads: 78, threats: 8 },
  { time: '16:00', uploads: 92, threats: 12 },
  { time: '20:00', uploads: 56, threats: 6 },
  { time: '24:00', uploads: 34, threats: 3 },
];

const fileSecurityData = [
  { name: 'Safe Files', value: 1834, color: '#10B981' },
  { name: 'Risky Files', value: 234, color: '#F59E0B' },
  { name: 'Blocked Files', value: 89, color: '#EF4444' },
];

const recentThreats: Threat[] = [
  {
    id: 1,
    type: 'Malware Detected',
    file: 'suspicious.exe',
    severity: 'danger',
    status: 'active',
    time: '2 min ago',
    ip: '198.51.100.14',
    description:
      'Binary exhibits polymorphic behavior and matches known ransomware signatures from the last threat intelligence sync.',
  },
  {
    id: 2,
    type: 'Unauthorized Access',
    file: 'config.json',
    severity: 'warning',
    status: 'active',
    time: '15 min ago',
    ip: '203.0.113.5',
    description:
      'Unexpected access attempt from a non-whitelisted location. Request was blocked after policy evaluation.',
  },
  {
    id: 3,
    type: 'SQL Injection Attempt',
    file: 'query.sql',
    severity: 'danger',
    status: 'active',
    time: '1 hour ago',
    ip: '192.0.2.34',
    description:
      'Input payload includes chained SQL statements and bypass patterns. WAF raised and contained this event.',
  },
  {
    id: 4,
    type: 'Suspicious Pattern',
    file: 'data.csv',
    severity: 'warning',
    status: 'active',
    time: '2 hours ago',
    ip: '198.51.100.23',
    description:
      'File includes unusual embedded formulas and encoded strings requiring analyst review before release.',
  },
];

const kpiConfig = [
  { key: 'uploads' as KPIKey, title: 'Total Uploads', value: 2157, icon: Upload, variant: 'primary' as const, trend: '+12.5%', positive: true },
  { key: 'users' as KPIKey, title: 'Active Users', value: 847, icon: Users, variant: 'success' as const, trend: '+8.2%', positive: true },
  { key: 'blocked' as KPIKey, title: 'Blocked IPs', value: 156, icon: Ban, variant: 'warning' as const, trend: '+23.1%', positive: false },
  { key: 'threats' as KPIKey, title: 'Threats Detected', value: 89, icon: AlertTriangle, variant: 'danger' as const, trend: '-5.3%', positive: true },
];

function CountUpNumber({ value }: { value: number }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let frameId: number;
    const start = performance.now();
    const duration = 900;

    const animate = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplayValue(Math.floor(value * progress));
      if (progress < 1) frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [value]);

  return <>{displayValue.toLocaleString()}</>;
}

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ElementType;
  variant: 'primary' | 'success' | 'warning' | 'danger';
  trend: string;
  positive: boolean;
  active: boolean;
  onClick: () => void;
}

function StatCard({ title, value, icon: Icon, variant, trend, positive, active, onClick }: StatCardProps) {
  const colorMap = {
    primary: 'text-[#3B82F6] bg-[#3B82F6]/10',
    success: 'text-[#10B981] bg-[#10B981]/10',
    warning: 'text-[#F59E0B] bg-[#F59E0B]/10',
    danger: 'text-[#EF4444] bg-[#EF4444]/10',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'w-full rounded-2xl border border-white/10 bg-[#111827]/80 p-5 text-left shadow-xl transition-all duration-200 hover:-translate-y-0.5 hover:shadow-2xl',
        active && 'ring-2 ring-[#3B82F6]'
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className={cn('rounded-xl p-2.5', colorMap[variant])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className={cn('flex items-center gap-1 text-xs font-medium', positive ? 'text-[#10B981]' : 'text-[#EF4444]')}>
          <TrendingUp className={cn('h-3.5 w-3.5', !positive && 'rotate-180')} />
          <span>{trend}</span>
        </div>
      </div>
      <p className="text-3xl font-bold text-[#E5E7EB]">
        <CountUpNumber value={value} />
      </p>
      <p className="mt-1 text-sm text-[#9CA3AF]">{title}</p>
    </button>
  );
}

function SkeletonCard() {
  return <div className="h-28 animate-pulse rounded-2xl border border-white/10 bg-white/5" />;
}

export function Dashboard() {
  const [activeKpi, setActiveKpi] = useState<KPIKey | null>(null);
  const [dashboardState, setDashboardState] = useState<DashboardState>('loading');
  const [threats, setThreats] = useState<Threat[]>(recentThreats);
  const [selectedThreat, setSelectedThreat] = useState<Threat | null>(null);
  const [recentlyUpdatedThreatId, setRecentlyUpdatedThreatId] = useState<number | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const threatTableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => setDashboardState('ready'), 700);
    return () => clearTimeout(timer);
  }, []);

  const filteredThreats = useMemo(() => {
    if (!activeKpi) return threats;
    if (activeKpi === 'threats') return threats.filter((item) => item.severity !== 'safe');
    if (activeKpi === 'blocked') return threats.filter((item) => item.severity === 'danger');
    return threats;
  }, [activeKpi, threats]);

  const dynamicKpis = useMemo(() => {
    const safeResolved = threats.filter((threat) => threat.severity === 'safe').length;
    const activeThreatCount = threats.filter((threat) => threat.severity !== 'safe').length;

    return kpiConfig.map((item) => {
      if (item.key === 'threats') {
        return { ...item, value: Math.max(0, item.value - safeResolved), subtitleValue: activeThreatCount };
      }
      return { ...item, subtitleValue: null };
    });
  }, [threats]);

  const dynamicFileSecurityData = useMemo(() => {
    const safeResolved = threats.filter((threat) => threat.severity === 'safe').length;
    return fileSecurityData.map((item) => {
      if (item.name === 'Safe Files') {
        return { ...item, value: item.value + safeResolved };
      }
      if (item.name === 'Risky Files') {
        return { ...item, value: Math.max(0, item.value - safeResolved) };
      }
      return item;
    });
  }, [threats]);

  const handleKpiClick = (key: KPIKey) => {
    setActiveKpi((prev) => (prev === key ? null : key));
    if (key === 'threats' || key === 'blocked') {
      requestAnimationFrame(() => {
        threatTableRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  };

  const openThreatDrawer = (threat: Threat) => setSelectedThreat(threat);
  const closeThreatDrawer = () => setSelectedThreat(null);

  const showToast = (message: string) => {
    setToastMessage(message);
    window.setTimeout(() => {
      setToastMessage(null);
    }, 2600);
  };

  const handleMarkSafe = (threat: Threat) => {
    if (threat.severity === 'safe') return;

    setThreats((prev) =>
      prev.map((item) =>
        item.id === threat.id
          ? {
              ...item,
              severity: 'safe',
              status: 'resolved',
              time: 'just now',
            }
          : item
      )
    );
    setSelectedThreat((prev) =>
      prev && prev.id === threat.id
        ? {
            ...prev,
            severity: 'safe',
            status: 'resolved',
            time: 'just now',
          }
        : prev
    );
    setRecentlyUpdatedThreatId(threat.id);
    showToast('Threat marked as safe');
    window.setTimeout(() => {
      setRecentlyUpdatedThreatId(null);
    }, 1400);
  };

  if (dashboardState === 'error') {
    return (
      <div className="p-8">
        <Card glass className="mx-auto max-w-3xl border border-[#EF4444]/30">
          <CardContent>
            <p className="text-lg font-semibold text-[#E5E7EB]">Dashboard unavailable</p>
            <p className="mt-2 text-sm text-[#9CA3AF]">We could not load your latest security metrics.</p>
            <Button className="mt-4" onClick={() => setDashboardState('loading')}>
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="px-6 py-6">
      <div className="mx-auto w-full max-w-[1520px] space-y-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#E5E7EB]">Security Dashboard</h1>
            <p className="mt-1 text-[#9CA3AF]">Real-time monitoring and threat analysis</p>
          </div>
          <div className="hidden items-center gap-2 rounded-xl border border-[#10B981]/20 bg-[#10B981]/10 px-3 py-2 text-xs text-[#10B981] md:flex">
            <Activity className="h-4 w-4" />
            <span className="font-medium">Live monitoring active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {dashboardState === 'loading'
            ? Array.from({ length: 4 }).map((_, idx) => <SkeletonCard key={idx} />)
            : dynamicKpis.map((kpi) => (
                <StatCard
                  key={kpi.key}
                  title={kpi.title}
                  value={kpi.value}
                  icon={kpi.icon}
                  variant={kpi.variant}
                  trend={kpi.trend}
                  positive={kpi.positive}
                  active={activeKpi === kpi.key}
                  onClick={() => handleKpiClick(kpi.key)}
                />
              ))}
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[2fr_1fr]">
          <Card glass>
            <CardHeader>
              <CardTitle>Activity Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardState === 'loading' ? (
                <div className="h-[300px] animate-pulse rounded-xl bg-white/5" />
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={activityData}>
                    <defs>
                      <linearGradient id="uploadsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                      <linearGradient id="threatsGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#EF4444" stopOpacity={0.22} />
                        <stop offset="100%" stopColor="#EF4444" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#2D3748" />
                    <XAxis dataKey="time" stroke="#9CA3AF" />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip
                      cursor={{ stroke: '#374151' }}
                      contentStyle={{
                        backgroundColor: '#111827',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                      }}
                    />
                    <Area type="monotone" dataKey="uploads" stroke="none" fill="url(#uploadsGradient)" />
                    <Area type="monotone" dataKey="threats" stroke="none" fill="url(#threatsGradient)" />
                    <Line type="monotone" dataKey="uploads" stroke="#3B82F6" strokeWidth={2.5} dot={false} isAnimationActive />
                    <Line type="monotone" dataKey="threats" stroke="#EF4444" strokeWidth={2.5} dot={false} isAnimationActive />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card glass>
            <CardHeader>
              <CardTitle>File Security Status</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboardState === 'loading' ? (
                <div className="h-[300px] animate-pulse rounded-xl bg-white/5" />
              ) : (
                <>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={dynamicFileSecurityData} dataKey="value" innerRadius={64} outerRadius={92}>
                        {dynamicFileSecurityData.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#111827',
                          border: '1px solid rgba(255,255,255,0.1)',
                          borderRadius: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="space-y-2">
                    {dynamicFileSecurityData.map((item) => (
                      <div key={item.name} className="flex items-center justify-between rounded-lg px-2 py-1 hover:bg-white/5">
                        <div className="flex items-center gap-2 text-sm text-[#9CA3AF]">
                          <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                          {item.name}
                        </div>
                        <span className="text-sm font-medium text-[#E5E7EB]">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        <Card glass ref={threatTableRef} className="w-full">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Threats</CardTitle>
              <div className="flex items-center gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-[#10B981]">
                  <span className="h-2 w-2 rounded-full bg-[#10B981]" /> Active
                </span>
                <span className="inline-flex items-center gap-1 text-[#EF4444]">
                  <span className="h-2 w-2 rounded-full bg-[#EF4444]" /> Issues
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {dashboardState === 'loading' ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="h-12 animate-pulse rounded-lg bg-white/5" />
                ))}
              </div>
            ) : dashboardState === 'empty' || filteredThreats.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
                <Shield className="mx-auto mb-2 h-6 w-6 text-[#10B981]" />
                <p className="font-medium text-[#E5E7EB]">No threats in selected scope</p>
                <p className="mt-1 text-sm text-[#9CA3AF]">Try another KPI or time range.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/10 text-left text-xs uppercase tracking-wide text-[#9CA3AF]">
                      <th className="py-3">Threat Type</th>
                      <th className="py-3">File</th>
                      <th className="py-3">Severity</th>
                      <th className="py-3">IP</th>
                      <th className="py-3">Time</th>
                      <th className="py-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredThreats.map((threat) => (
                      <tr
                        key={threat.id}
                        className={cn(
                          'cursor-pointer border-b border-white/5 transition-colors hover:bg-white/5',
                          recentlyUpdatedThreatId === threat.id && 'animate-pulse bg-[#10B981]/10'
                        )}
                        onClick={() => openThreatDrawer(threat)}
                      >
                        <td className="py-4">
                          <div className="flex items-center gap-2 text-sm text-[#E5E7EB]">
                            <Lock
                              className={cn(
                                'h-4 w-4',
                                threat.severity === 'danger'
                                  ? 'text-[#EF4444]'
                                  : threat.severity === 'warning'
                                    ? 'text-[#F59E0B]'
                                    : 'text-[#10B981]'
                              )}
                            />
                            {threat.type}
                          </div>
                        </td>
                        <td className="py-4 text-sm text-[#9CA3AF]">
                          <code className="rounded bg-white/5 px-2 py-1 text-xs">{threat.file}</code>
                        </td>
                        <td className="py-4">
                          <Badge
                            variant={
                              threat.severity === 'danger'
                                ? 'danger'
                                : threat.severity === 'warning'
                                  ? 'warning'
                                  : 'secure'
                            }
                          >
                            {threat.severity === 'danger'
                              ? 'Critical'
                              : threat.severity === 'warning'
                                ? 'Warning'
                                : 'Safe'}
                          </Badge>
                        </td>
                        <td className="py-4 text-sm text-[#9CA3AF]">{threat.ip}</td>
                        <td className="py-4 text-sm text-[#9CA3AF]">{threat.time}</td>
                        <td className="py-4">
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="secondary"
                              size="sm"
                              className="gap-1"
                              onClick={(event) => {
                                event.stopPropagation();
                                openThreatDrawer(threat);
                              }}
                            >
                              <Eye className="h-3.5 w-3.5" />
                              View Details
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              className="font-semibold"
                              onClick={(event) => {
                                event.stopPropagation();
                              }}
                            >
                              Block IP
                            </Button>
                            <Button
                              variant="success"
                              size="sm"
                              className="gap-1 font-semibold"
                              disabled={threat.severity === 'safe'}
                              onClick={(event) => {
                                event.stopPropagation();
                                handleMarkSafe(threat);
                              }}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Mark as Safe
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <ThreatDrawer
          isOpen={!!selectedThreat}
          threat={selectedThreat}
          onClose={closeThreatDrawer}
          onBlockIP={closeThreatDrawer}
          onMarkSafe={handleMarkSafe}
          onDeleteFile={closeThreatDrawer}
        />

        {toastMessage ? (
          <div className="fixed bottom-6 right-6 z-[70]">
            <div className="flex items-center gap-3 rounded-xl border border-[#10B981]/30 bg-[#052E1A] px-4 py-3 shadow-2xl">
              <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
              <span className="text-sm font-medium text-[#D1FAE5]">{toastMessage}</span>
              <button
                type="button"
                onClick={() => setToastMessage(null)}
                className="rounded p-0.5 text-[#86EFAC] hover:bg-white/10"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}