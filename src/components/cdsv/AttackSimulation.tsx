import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Ban,
  CheckCircle2,
  Circle,
  Clock3,
  Eye,
  Lock,
  PlayCircle,
  ShieldCheck,
  Server,
  Shield,
  Skull,
  Terminal,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { cn } from '../shadcn/utils';

type AttackState = 'idle' | 'running' | 'completed';
type TimelineStage = 'start' | 'attack' | 'defense' | 'complete';

interface LogEntry {
  id: number;
  timestamp: string;
  type: 'info' | 'warning' | 'error' | 'success' | 'attack';
  message: string;
  ip?: string;
}

interface Stats {
  totalRequests: number;
  blockedIPs: number;
  threatsDetected: number;
  attacksBlocked: number;
}

const threatsList = [
  { key: 'sql', icon: AlertCircle, label: 'SQL Injection', color: '#EF4444' },
  { key: 'ddos', icon: Zap, label: 'DDoS Attack', color: '#F59E0B' },
  { key: 'brute', icon: Lock, label: 'Brute Force', color: '#EF4444' },
  { key: 'xss', icon: AlertTriangle, label: 'XSS Payload', color: '#F59E0B' },
  { key: 'scan', icon: TrendingUp, label: 'Port Scanning', color: '#EF4444' },
];

const patterns = [
  { key: 'sql', message: 'SQL injection payload detected' },
  { key: 'ddos', message: 'DDoS burst pattern identified' },
  { key: 'brute', message: 'Brute-force login activity detected' },
  { key: 'xss', message: 'XSS payload blocked at gateway' },
  { key: 'scan', message: 'Port scanning behavior detected' },
];

const randomIP = () =>
  `${Math.floor(Math.random() * 220) + 10}.${Math.floor(Math.random() * 220) + 10}.${Math.floor(
    Math.random() * 220
  ) + 10}.${Math.floor(Math.random() * 220) + 10}`;

const timestamp = () => new Date().toTimeString().split(' ')[0];

function AnimatedCounter({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);
  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 450;
    const from = display;
    const to = value;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(from + (to - from) * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);
  return <>{display}</>;
}

function TypewriterLine({ text }: { text: string }) {
  const [chars, setChars] = useState(0);
  useEffect(() => {
    setChars(0);
    const interval = setInterval(() => {
      setChars(prev => {
        if (prev >= text.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 2;
      });
    }, 14);
    return () => clearInterval(interval);
  }, [text]);
  return <>{text.slice(0, chars)}</>;
}

function severityBadge(type: LogEntry['type']) {
  if (type === 'error' || type === 'attack') return { label: 'ERROR', style: 'bg-[#EF4444]/15 text-[#EF4444]' };
  if (type === 'warning') return { label: 'WARN', style: 'bg-[#F59E0B]/15 text-[#F59E0B]' };
  if (type === 'success') return { label: 'OK', style: 'bg-[#10B981]/15 text-[#10B981]' };
  return { label: 'INFO', style: 'bg-[#38BDF8]/15 text-[#38BDF8]' };
}

export function AttackSimulation() {
  const [attackState, setAttackState] = useState<AttackState>('idle');
  const [timelineStage, setTimelineStage] = useState<TimelineStage>('start');
  const [logs, setLogs] = useState<LogEntry[]>([
    { id: 0, timestamp: timestamp(), type: 'success', message: 'Security system initialized' },
    { id: 1, timestamp: timestamp(), type: 'info', message: 'Firewall active - monitoring traffic' },
  ]);
  const [activeThreatKey, setActiveThreatKey] = useState<string | null>(null);
  const [stats, setStats] = useState<Stats>({
    totalRequests: 0,
    blockedIPs: 0,
    threatsDetected: 0,
    attacksBlocked: 0,
  });
  const [defenseIntegrity, setDefenseIntegrity] = useState(100);
  const [topAlert, setTopAlert] = useState<string | null>(null);
  const [showRunSuccess, setShowRunSuccess] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);
  const logIdRef = useRef(2);

  useEffect(() => {
    if (logContainerRef.current) {
      logContainerRef.current.scrollTo({
        top: logContainerRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, [logs]);

  const addLog = (type: LogEntry['type'], message: string, ip?: string) => {
    const entry: LogEntry = { id: logIdRef.current++, timestamp: timestamp(), type, message, ip };
    setLogs(prev => [...prev, entry]);
  };

  const simulateAttack = () => {
    if (attackState === 'running') return;

    setAttackState('running');
    setTimelineStage('start');
    setTopAlert('Attack simulation running in controlled environment');
    addLog('warning', 'Attack simulation initiated');

    let eventCount = 0;
    const maxEvents = 24;

    const interval = setInterval(() => {
      if (eventCount >= maxEvents) {
        clearInterval(interval);
        setAttackState('completed');
        setTimelineStage('complete');
        setActiveThreatKey(null);
        setDefenseIntegrity(100);
        setTopAlert('Simulation completed - defenses restored');
        addLog('success', 'Simulation completed - all threats neutralized');
        setShowRunSuccess(true);
        setTimeout(() => setShowRunSuccess(false), 1800);
        return;
      }

      const pattern = patterns[Math.floor(Math.random() * patterns.length)] || patterns[0];
      const ip = randomIP();
      setActiveThreatKey(pattern.key);
      setTimelineStage(eventCount < 8 ? 'attack' : eventCount < 18 ? 'defense' : 'complete');

      setStats(prev => ({
        totalRequests: prev.totalRequests + Math.floor(Math.random() * 12) + 6,
        blockedIPs: prev.blockedIPs + (Math.random() > 0.4 ? 1 : 0),
        threatsDetected: prev.threatsDetected + 1,
        attacksBlocked: prev.attacksBlocked + (Math.random() > 0.3 ? 1 : 0),
      }));

      setDefenseIntegrity(prev => {
        const dip = Math.floor(Math.random() * 4) + 1;
        return Math.max(68, prev - dip);
      });

      addLog('attack', `${pattern.message} from ${ip}`, ip);
      if (Math.random() > 0.5) addLog('warning', `Rate anomaly detected (${Math.floor(Math.random() * 200) + 90} req/s)`, ip);
      if (Math.random() > 0.65) addLog('error', `IP ${ip} blocked by adaptive firewall`, ip);

      eventCount += 1;
    }, 420);
  };

  const resetStats = () => {
    setStats({ totalRequests: 0, blockedIPs: 0, threatsDetected: 0, attacksBlocked: 0 });
    setDefenseIntegrity(100);
    setTimelineStage('start');
    setAttackState('idle');
    setTopAlert(null);
    addLog('info', 'Simulation statistics reset');
  };

  const clearLogs = () => {
    setLogs([{ id: logIdRef.current++, timestamp: timestamp(), type: 'info', message: 'Logs cleared by operator' }]);
  };

  const logColor = (type: LogEntry['type']) => {
    if (type === 'success') return 'text-[#10B981]';
    if (type === 'warning') return 'text-[#F59E0B]';
    if (type === 'error') return 'text-[#EF4444]';
    if (type === 'attack') return 'text-[#F87171]';
    return 'text-[#38BDF8]';
  };

  const attackButtonLabel =
    attackState === 'running' ? 'Simulation Running...' : attackState === 'completed' ? 'Run Again' : 'Simulate Attack';

  const timeline = [
    { key: 'start' as TimelineStage, label: 'Start', icon: PlayCircle },
    { key: 'attack' as TimelineStage, label: 'Attack Types', icon: Skull },
    { key: 'defense' as TimelineStage, label: 'Defense Response', icon: Shield },
    { key: 'complete' as TimelineStage, label: 'Complete', icon: ShieldCheck },
  ];

  const liveMessage =
    attackState === 'running'
      ? 'SOC live feed active: threat telemetry streaming'
      : attackState === 'completed'
        ? 'SOC replay complete: all controls operational'
        : 'SOC standby mode: monitoring baseline traffic';

  const defenseColor = defenseIntegrity < 75 ? '#EF4444' : defenseIntegrity < 90 ? '#F59E0B' : '#10B981';
  const defenseMessage =
    defenseIntegrity < 75
      ? 'Defense pressure high - mitigation in progress'
      : defenseIntegrity < 90
        ? 'Defense adapting to active threats'
        : 'Defense posture stable and healthy';

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0F1A] p-8">
      <motion.div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(239,68,68,0.14),transparent_42%),radial-gradient(circle_at_85%_20%,rgba(59,130,246,0.11),transparent_35%)]"
        animate={{ scale: attackState === 'running' ? 1.03 : 1 }}
        transition={{ duration: 0.9, ease: 'easeOut' }}
      />

      <div className="relative z-10 mx-auto max-w-7xl">
        <AnimatePresence>
          {topAlert && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-4 rounded-xl border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-2 text-sm text-[#FCA5A5]"
            >
              {topAlert}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#EF4444]/10 p-3">
              <Skull className="h-6 w-6 text-[#EF4444]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#E5E7EB]">Attack Simulation Center</h1>
              <p className="text-[#9CA3AF]">Real-time cybersecurity attack and defense simulator.</p>
            </div>
          </div>
          <Badge variant={attackState === 'running' ? 'danger' : 'secure'}>
            <Activity className="mr-1 h-3 w-3" />
            {attackState === 'running' ? 'Attack in progress' : attackState === 'completed' ? 'Simulation complete' : 'System secure'}
          </Badge>
        </div>

        <Card glass className="mb-4 border border-white/10">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <motion.span
                className="h-2.5 w-2.5 rounded-full bg-[#10B981]"
                animate={{ opacity: [1, 0.2, 1], scale: [1, 1.25, 1] }}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
              <span className="text-xs font-semibold uppercase tracking-wide text-[#9CA3AF]">Live Status</span>
            </div>
            <span className="text-sm text-[#E5E7EB]">{liveMessage}</span>
          </div>
        </Card>

        <Card glass className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            {timeline.map((step, index) => (
              <div key={step.key} className="flex items-center gap-3">
                <motion.div
                  className={cn(
                    'flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium',
                    step.key === timelineStage
                      ? 'bg-[#3B82F6] text-white'
                      : 'bg-white/10 text-[#9CA3AF]'
                  )}
                  animate={{ scale: step.key === timelineStage ? [1, 1.06, 1] : 1 }}
                  transition={{ duration: 0.8, repeat: step.key === timelineStage ? Infinity : 0 }}
                >
                  <step.icon className="h-3.5 w-3.5" />
                  {step.label}
                </motion.div>
                {index < timeline.length - 1 && <div className="h-px w-8 bg-white/20" />}
              </div>
            ))}
          </div>
        </Card>

        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-4">
          <Card glass className="border border-[#3B82F6]/20">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#3B82F6]/10 p-2"><Server className="h-5 w-5 text-[#3B82F6]" /></div>
              <motion.div animate={{ scale: attackState === 'running' ? [1, 1.03, 1] : 1 }} transition={{ duration: 0.5 }}>
                <p className="text-2xl font-bold text-[#E5E7EB]"><AnimatedCounter value={stats.totalRequests} /></p><p className="text-xs text-[#9CA3AF]">Total Requests</p>
              </motion.div>
            </div>
          </Card>
          <Card glass className="border border-[#EF4444]/20">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#EF4444]/10 p-2"><Ban className="h-5 w-5 text-[#EF4444]" /></div>
              <motion.div animate={{ scale: attackState === 'running' ? [1, 1.03, 1] : 1 }} transition={{ duration: 0.5, delay: 0.05 }}>
                <p className="text-2xl font-bold text-[#E5E7EB]"><AnimatedCounter value={stats.blockedIPs} /></p><p className="text-xs text-[#9CA3AF]">Blocked IPs</p>
              </motion.div>
            </div>
          </Card>
          <Card glass className="border border-[#F59E0B]/20">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F59E0B]/10 p-2"><AlertTriangle className="h-5 w-5 text-[#F59E0B]" /></div>
              <motion.div animate={{ scale: attackState === 'running' ? [1, 1.03, 1] : 1 }} transition={{ duration: 0.5, delay: 0.1 }}>
                <p className="text-2xl font-bold text-[#E5E7EB]"><AnimatedCounter value={stats.threatsDetected} /></p><p className="text-xs text-[#9CA3AF]">Threats Detected</p>
              </motion.div>
            </div>
          </Card>
          <Card glass className="border border-[#10B981]/20">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#10B981]/10 p-2"><Shield className="h-5 w-5 text-[#10B981]" /></div>
              <motion.div animate={{ scale: attackState === 'running' ? [1, 1.03, 1] : 1 }} transition={{ duration: 0.5, delay: 0.15 }}>
                <p className="text-2xl font-bold text-[#E5E7EB]"><AnimatedCounter value={stats.attacksBlocked} /></p><p className="text-xs text-[#9CA3AF]">Attacks Blocked</p>
              </motion.div>
            </div>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card glass className="border border-[#10B981]/20 bg-black/35">
              <div className="flex items-center justify-between border-b border-white/10 p-4">
                <div className="flex items-center gap-3">
                  <Terminal className="h-5 w-5 text-[#10B981]" />
                  <h2 className="font-mono text-sm font-semibold text-[#E5E7EB]">SYSTEM.LOG</h2>
                  <div className="flex items-center gap-1">
                    <motion.div className="h-2 w-2 rounded-full bg-[#10B981]" animate={{ opacity: [1, 0.35, 1] }} transition={{ duration: 1.6, repeat: Infinity }} />
                    <span className="text-xs text-[#10B981]">LIVE</span>
                  </div>
                </div>
                <button onClick={clearLogs} className="rounded-lg px-3 py-1 text-xs text-[#9CA3AF] transition-colors hover:bg-white/10 hover:text-[#E5E7EB]">
                  Clear
                </button>
              </div>

              <div ref={logContainerRef} className="custom-scrollbar h-[500px] space-y-1 overflow-y-auto p-4 font-mono text-xs">
                <AnimatePresence initial={false}>
                  {logs.map((log, index) => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16 }}
                      className={cn(
                        'flex items-start gap-3 rounded-md px-1 py-0.5',
                        index === logs.length - 1 && 'bg-white/5'
                      )}
                    >
                      <span className="shrink-0 text-[#6B7280]">[{log.timestamp}]</span>
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold', severityBadge(log.type).style)}>
                        {severityBadge(log.type).label}
                      </span>
                      <span className={cn('flex-1', logColor(log.type))}>
                        {index === logs.length - 1 ? <TypewriterLine text={log.message} /> : log.message}
                        {log.ip && <span className="ml-2 text-[#9CA3AF]">({log.ip})</span>}
                        {index === logs.length - 1 && <span className="ml-1 inline-block h-3 w-1 animate-pulse bg-[#9CA3AF]" />}
                      </span>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </Card>
          </div>

          <div className="space-y-6">
            <Card glass className="border border-[#EF4444]/20">
              <div className="space-y-4">
                <div className="mb-2 flex items-center gap-3">
                  <div className="rounded-lg bg-[#EF4444]/10 p-2"><Zap className="h-5 w-5 text-[#EF4444]" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#E5E7EB]">Attack Simulation</h3>
                    <p className="text-xs text-[#9CA3AF]">Run controlled penetration traffic.</p>
                  </div>
                </div>
                <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                  <Button variant="danger" className="w-full gap-2" onClick={simulateAttack} disabled={attackState === 'running'}>
                    {attackState === 'running' ? <Activity className="h-4 w-4 animate-spin" /> : <Skull className="h-4 w-4" />}
                    {attackButtonLabel}
                  </Button>
                </motion.div>
                <AnimatePresence>
                  {showRunSuccess && (
                    <motion.p
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 4 }}
                      className="rounded-lg border border-[#10B981]/30 bg-[#10B981]/10 px-3 py-2 text-xs text-[#10B981]"
                    >
                      Simulation completed successfully.
                    </motion.p>
                  )}
                </AnimatePresence>
                <Button variant="secondary" size="sm" className="w-full" onClick={resetStats}>
                  Reset Statistics
                </Button>
              </div>
            </Card>

            <Card glass>
              <div className="space-y-3">
                <div className="mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-[#F59E0B]" />
                  <h3 className="text-sm font-semibold text-[#E5E7EB]">Monitored Threats</h3>
                </div>
                {threatsList.map(threat => (
                  <motion.div
                    key={threat.key}
                    whileHover={{ scale: 1.02 }}
                    className={cn(
                      'flex items-center justify-between rounded-lg border border-white/10 bg-white/5 p-2 transition-all',
                      activeThreatKey === threat.key && 'border-[#F59E0B]/50 bg-[#F59E0B]/10 shadow-[0_0_18px_rgba(245,158,11,0.25)]',
                      attackState === 'completed' && activeThreatKey !== threat.key && 'opacity-55'
                    )}
                    animate={activeThreatKey === threat.key ? { scale: [1, 1.03, 1] } : { scale: 1 }}
                    transition={{ duration: 0.7, repeat: activeThreatKey === threat.key ? Infinity : 0 }}
                  >
                    <div className="flex items-center gap-2">
                      <threat.icon className="h-4 w-4" style={{ color: threat.color }} />
                      <span className="text-xs text-[#E5E7EB]">{threat.label}</span>
                    </div>
                    <CheckCircle2 className={cn('h-4 w-4', activeThreatKey === threat.key ? 'text-[#F59E0B]' : 'text-[#10B981]')} />
                  </motion.div>
                ))}
              </div>
            </Card>

            <Card glass className="border border-[#10B981]/20">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#10B981]/10 p-2"><Shield className="h-5 w-5 text-[#10B981]" /></div>
                <div className="flex-1">
                  <div className="mb-1 flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-[#E5E7EB]">Defense Status</h3>
                    <span className={cn('text-xs font-semibold', defenseIntegrity < 75 ? 'text-[#F59E0B]' : 'text-[#10B981]')}>
                      {defenseIntegrity}%
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
                    <motion.div
                      className="h-full"
                      style={{ backgroundColor: defenseColor }}
                      animate={{ width: `${defenseIntegrity}%` }}
                      transition={{ duration: 0.35 }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-[#9CA3AF]">{defenseMessage}</p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 8px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0, 0, 0, 0.22); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(16, 185, 129, 0.34); border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(16, 185, 129, 0.52); }
      `}</style>
    </div>
  );
}
