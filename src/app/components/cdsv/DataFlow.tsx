import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Cloud,
  Lock,
  Monitor,
  Server,
  Shield,
  User,
  Zap,
} from 'lucide-react';
import { Card } from './Card';
import { Badge } from './Badge';
import { Button } from './Button';
import { cn } from '../ui/utils';

type PacketStatus = 'safe' | 'suspicious' | 'threat';
type NodeState = 'active' | 'idle' | 'error';

interface FlowNode {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  description: string;
}

interface DataPacket {
  id: number;
  progress: number;
  status: PacketStatus;
  fileName: string;
  encrypted: boolean;
  ipAddress: string;
  timestamp: number;
  blockedAtBackend?: boolean;
}

const nodes: FlowNode[] = [
  { id: 'user', label: 'User', icon: <User className="w-8 h-8" />, color: '#3B82F6', description: 'Data Input' },
  { id: 'frontend', label: 'Frontend', icon: <Monitor className="w-8 h-8" />, color: '#10B981', description: 'Client Layer' },
  { id: 'backend', label: 'Backend', icon: <Server className="w-8 h-8" />, color: '#8B5CF6', description: 'API Gateway' },
  { id: 'encryption', label: 'Encryption', icon: <Lock className="w-8 h-8" />, color: '#F59E0B', description: 'AES-256' },
  { id: 'cloud', label: 'Cloud Storage', icon: <Cloud className="w-8 h-8" />, color: '#06B6D4', description: 'Secure Storage' },
];

const files = [
  'audit_log_2026.csv',
  'quarterly_report.pdf',
  'incident_dump.json',
  'tenant_backup.sql',
  'suspicious_macro.docm',
  'hr_export.xlsx',
];

export function DataFlow() {
  const [packets, setPackets] = useState<DataPacket[]>([]);
  const [isAnimating, setIsAnimating] = useState(true);
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  const [selectedPacket, setSelectedPacket] = useState<DataPacket | null>(null);
  const [speed, setSpeed] = useState<1 | 2>(1);
  const [showThreatsOnly, setShowThreatsOnly] = useState(false);
  const [threatText, setThreatText] = useState<string | null>(null);
  const [latency, setLatency] = useState(24);
  const [totalProcessed, setTotalProcessed] = useState(0);
  const [nodeLastActivity, setNodeLastActivity] = useState<Record<string, number>>({});
  const nextPacketIdRef = useRef(1);
  const threatTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isAnimating) return;

    const timer = setInterval(() => {
      setPackets(prev => {
        const created = [...prev];
        if (created.length < 22) {
          const seed = Math.random();
          const status: PacketStatus = seed < 0.7 ? 'safe' : seed < 0.9 ? 'suspicious' : 'threat';
          created.push({
            id: nextPacketIdRef.current,
            progress: 0,
            status,
            fileName: files[Math.floor(Math.random() * files.length)] || 'payload.bin',
            encrypted: false,
            ipAddress: `${Math.floor(Math.random() * 220) + 10}.${Math.floor(Math.random() * 220) + 10}.${Math.floor(Math.random() * 220) + 10}.${Math.floor(Math.random() * 220) + 10}`,
            timestamp: Date.now(),
          });
          nextPacketIdRef.current += 1;
        }

        return created
          .map(packet => {
            const step = speed === 2 ? 1.4 : 0.7;
            const nextProgress = packet.progress + step;
            const nodeIndex = Math.floor(nextProgress / 25);
            const blocked = packet.status === 'threat' && nodeIndex >= 2;
            if (blocked && !packet.blockedAtBackend) {
              setThreatText(`Threat detected: ${packet.fileName}`);
              if (threatTimeoutRef.current) {
                window.clearTimeout(threatTimeoutRef.current);
              }
              threatTimeoutRef.current = window.setTimeout(() => setThreatText(null), 1600);
            }
            return {
              ...packet,
              progress: blocked ? 50 : nextProgress,
              blockedAtBackend: blocked,
              encrypted: !blocked && nodeIndex >= 3,
            };
          })
          .filter(packet => (packet.blockedAtBackend ? packet.progress <= 50 : packet.progress <= 100));
      });
    }, speed === 2 ? 340 : 700);

    return () => clearInterval(timer);
  }, [isAnimating, speed]);

  useEffect(() => {
    return () => {
      if (threatTimeoutRef.current) {
        window.clearTimeout(threatTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const now = Date.now();
    const updates: Record<string, number> = {};
    packets.forEach(packet => {
      const index = Math.min(Math.floor(packet.progress / 25), nodes.length - 1);
      const node = nodes[index];
      if (node) updates[node.id] = now;
    });
    if (Object.keys(updates).length > 0) {
      setNodeLastActivity(prev => ({ ...prev, ...updates }));
    }
  }, [packets]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!isAnimating) return;
      setTotalProcessed(v => v + (speed === 2 ? 3 : 1));
      setLatency(20 + Math.floor(Math.random() * 16));
    }, 1000);
    return () => clearInterval(timer);
  }, [isAnimating, speed]);

  const visiblePackets = showThreatsOnly ? packets.filter(packet => packet.status === 'threat') : packets;
  const activePackets = visiblePackets.length;
  const encryptedPackets = visiblePackets.filter(packet => packet.encrypted).length;
  const encryptionRate = activePackets === 0 ? 100 : Math.round((encryptedPackets / activePackets) * 100);
  const threatsNow = visiblePackets.filter(packet => packet.status === 'threat').length;

  const nodeStates: Record<string, NodeState> = useMemo(() => {
    const state: Record<string, NodeState> = {};
    nodes.forEach((node, index) => {
      const hasTraffic = visiblePackets.some(packet => Math.floor(packet.progress / 25) === index);
      const hasThreat = visiblePackets.some(
        packet => packet.status === 'threat' && Math.floor(packet.progress / 25) === index
      );
      state[node.id] = hasThreat ? 'error' : hasTraffic ? 'active' : 'idle';
    });
    return state;
  }, [visiblePackets]);

  const nodeMetrics = useMemo(() => {
    return nodes.map((node, index) => {
      const activeRequests = visiblePackets.filter(
        packet => Math.floor(packet.progress / 25) === index
      ).length;
      const errorCount = visiblePackets.filter(
        packet => packet.status === 'threat' && Math.floor(packet.progress / 25) === index
      ).length;
      const status = errorCount > 0 ? 'error' : activeRequests > 0 ? 'active' : 'idle';
      const nodeLatency = latency + (index * 2) + (status === 'error' ? 7 : 0);
      const activityTime = nodeLastActivity[node.id];
      const lastActivity = activityTime
        ? `${Math.max(1, Math.floor((Date.now() - activityTime) / 1000))}s ago`
        : 'No recent traffic';

      return {
        id: node.id,
        nodeName: node.label,
        status,
        activeRequests,
        errorCount,
        latency: `${nodeLatency}ms`,
        lastActivity,
      };
    });
  }, [latency, nodeLastActivity, visiblePackets]);

  const getNodePosition = (index: number) => ({ x: index * 220 + 100, y: 250 });

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0B0F1A] p-8">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_20%_20%,rgba(59,130,246,0.14),transparent_40%),radial-gradient(circle_at_85%_20%,rgba(16,185,129,0.12),transparent_35%),radial-gradient(circle_at_50%_90%,rgba(245,158,11,0.08),transparent_45%)]" />

      <div className="relative z-10 mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#E5E7EB]">Security Visualizer</h1>
            <p className="text-[#9CA3AF]">Real-time pipeline monitor and packet intelligence.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant={threatsNow > 0 ? 'danger' : 'secure'}>
              <CheckCircle2 className="mr-1 h-3 w-3" />
              {threatsNow > 0 ? 'Threat activity detected' : 'System healthy'}
            </Badge>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card glass>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#3B82F6]/10 p-2"><Zap className="h-5 w-5 text-[#3B82F6]" /></div>
              <div>
                <p className="text-2xl font-bold text-[#E5E7EB]">{activePackets}</p>
                <p className="text-xs text-[#9CA3AF]">Active Packets</p>
              </div>
            </div>
          </Card>
          <Card glass>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#10B981]/10 p-2"><Shield className="h-5 w-5 text-[#10B981]" /></div>
              <div>
                <p className="text-2xl font-bold text-[#E5E7EB]">{encryptionRate}%</p>
                <p className="text-xs text-[#9CA3AF]">Encryption Rate</p>
              </div>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <motion.div className="h-full bg-[#10B981]" animate={{ width: `${encryptionRate}%` }} />
            </div>
          </Card>
          <Card glass>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#F59E0B]/10 p-2"><Activity className="h-5 w-5 text-[#F59E0B]" /></div>
              <div>
                <p className="text-2xl font-bold text-[#E5E7EB]">{latency}ms</p>
                <p className="text-xs text-[#9CA3AF]">Live Latency</p>
              </div>
            </div>
          </Card>
          <Card glass>
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-[#06B6D4]/10 p-2"><Cloud className="h-5 w-5 text-[#06B6D4]" /></div>
              <div>
                <p className="text-2xl font-bold text-[#E5E7EB]">{totalProcessed}</p>
                <p className="text-xs text-[#9CA3AF]">Total Processed</p>
              </div>
            </div>
          </Card>
        </div>

        <Card glass className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant={isAnimating ? 'danger' : 'primary'} onClick={() => setIsAnimating(v => !v)}>
              {isAnimating ? 'Pause' : 'Start'}
            </Button>
            <div className="flex items-center gap-2">
              <span className="text-xs text-[#9CA3AF]">Speed</span>
              <Button size="sm" variant={speed === 1 ? 'primary' : 'secondary'} onClick={() => setSpeed(1)}>1x</Button>
              <Button size="sm" variant={speed === 2 ? 'primary' : 'secondary'} onClick={() => setSpeed(2)}>2x</Button>
            </div>
            <Button
              size="sm"
              variant={showThreatsOnly ? 'danger' : 'secondary'}
              onClick={() => setShowThreatsOnly(v => !v)}
            >
              {showThreatsOnly ? 'Show all traffic' : 'Show only threats'}
            </Button>
          </div>
        </Card>

        <Card glass className="min-h-[620px] p-8">
          {threatText && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 rounded-xl border border-[#EF4444]/40 bg-[#EF4444]/10 px-4 py-2 text-sm text-[#FCA5A5]"
            >
              Threat detected
            </motion.div>
          )}

          <svg width="100%" height="500" viewBox="0 0 1200 500" className="overflow-visible">
            <defs>
              <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="4" result="coloredBlur" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {[0, 1, 2, 3].map(i => {
              const start = getNodePosition(i);
              const end = getNodePosition(i + 1);
              return (
                <g key={`line-${i}`}>
                  <motion.line
                    x1={start.x + 40}
                    y1={start.y}
                    x2={end.x - 40}
                    y2={end.y}
                    stroke={nodes[i + 1]?.color}
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.55"
                    filter="url(#glow)"
                    animate={{ opacity: [0.35, 0.8, 0.35] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  />
                </g>
              );
            })}

            {visiblePackets.map(packet => {
              const pathIndex = Math.floor(packet.progress / 25);
              const localProgress = (packet.progress % 25) / 25;
              if (pathIndex >= 4) return null;
              const start = getNodePosition(pathIndex);
              const end = getNodePosition(pathIndex + 1);
              const x = start.x + 40 + (end.x - start.x - 80) * localProgress;
              const y = start.y;
              const color =
                packet.status === 'safe' ? '#10B981' : packet.status === 'suspicious' ? '#F59E0B' : '#EF4444';

              return (
                <g key={packet.id}>
                  <motion.circle
                    cx={x}
                    cy={y}
                    r="10"
                    fill={color}
                    opacity="0.35"
                    filter="url(#glow)"
                    animate={{ scale: [1, 1.4, 1] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                  <motion.circle
                    cx={x}
                    cy={y}
                    r="5.8"
                    fill={color}
                    filter="url(#glow)"
                    style={{ cursor: 'pointer' }}
                    stroke={selectedPacket?.id === packet.id ? '#E5E7EB' : 'transparent'}
                    strokeWidth={selectedPacket?.id === packet.id ? 2 : 0}
                    onClick={() => {
                      setSelectedNode(null);
                      setSelectedPacket(packet);
                    }}
                  />
                </g>
              );
            })}

            {nodes.map((node, index) => {
              const pos = getNodePosition(index);
              const state = nodeStates[node.id];
              const stateColor = state === 'error' ? '#EF4444' : state === 'active' ? '#10B981' : '#9CA3AF';
              return (
                <g key={node.id}>
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r="39"
                    fill={node.color}
                    opacity="0.2"
                    filter="url(#glow)"
                    animate={{ scale: state === 'active' ? [1, 1.06, 1] : 1 }}
                    transition={{ duration: 1.8, repeat: Infinity }}
                  />
                  <motion.circle
                    cx={pos.x}
                    cy={pos.y}
                    r="34"
                    fill="#111827"
                    stroke={stateColor}
                    strokeWidth="3"
                    style={{ cursor: 'pointer' }}
                    onClick={() => {
                      setSelectedPacket(null);
                      setSelectedNode(node.id);
                    }}
                  />
                  <foreignObject x={pos.x - 16} y={pos.y - 16} width="32" height="32">
                    <div style={{ color: node.color }}>{node.icon}</div>
                  </foreignObject>
                  <text x={pos.x} y={pos.y + 62} textAnchor="middle" fill="#E5E7EB" fontSize="14" fontWeight="600">
                    {node.label}
                  </text>
                  <text x={pos.x} y={pos.y + 80} textAnchor="middle" fill="#9CA3AF" fontSize="11">
                    {node.description}
                  </text>
                  <text x={pos.x} y={pos.y + 96} textAnchor="middle" fill={stateColor} fontSize="10">
                    {state.toUpperCase()}
                  </text>
                </g>
              );
            })}
          </svg>
        </Card>

        <AnimatePresence mode="wait">
          <motion.div
            key={selectedNode || (selectedPacket ? `packet-${selectedPacket.id}` : 'empty')}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2"
          >
            <Card glass className={cn(selectedNode && 'ring-1 ring-[#3B82F6]/50')}>
              <h3 className="mb-3 text-sm font-semibold text-[#E5E7EB]">Node Inspector</h3>
              {selectedNode ? (
                (() => {
                  const selected = nodeMetrics.find(item => item.id === selectedNode);
                  if (!selected) {
                    return <p className="text-sm text-[#9CA3AF]">Select a node or packet to inspect</p>;
                  }
                  return (
                    <div className="space-y-2 text-sm text-[#9CA3AF]">
                      <p className="font-medium text-[#E5E7EB]">{selected.nodeName}</p>
                      <p>
                        Status:{' '}
                        <span className={cn(
                          'font-medium',
                          selected.status === 'active' && 'text-[#10B981]',
                          selected.status === 'idle' && 'text-[#F59E0B]',
                          selected.status === 'error' && 'text-[#EF4444]'
                        )}>
                          {selected.status}
                        </span>
                      </p>
                      <p>Active Requests: {selected.activeRequests}</p>
                      <p>Error Count: {selected.errorCount}</p>
                      <p>Latency: {selected.latency}</p>
                      <p>Last Activity: {selected.lastActivity}</p>
                    </div>
                  );
                })()
              ) : (
                <p className="text-sm text-[#9CA3AF]">Select a node or packet to inspect</p>
              )}
            </Card>

            <Card glass className={cn(selectedPacket && 'ring-1 ring-[#3B82F6]/50')}>
              <h3 className="mb-3 text-sm font-semibold text-[#E5E7EB]">Packet Inspector</h3>
              {selectedPacket ? (
                <div className="space-y-2 text-sm text-[#9CA3AF]">
                  <p className="font-medium text-[#E5E7EB]">{selectedPacket.fileName}</p>
                  <p>
                    Status:{' '}
                    <span className={cn(
                      selectedPacket.status === 'safe' && 'text-[#10B981]',
                      selectedPacket.status === 'suspicious' && 'text-[#F59E0B]',
                      selectedPacket.status === 'threat' && 'text-[#EF4444]'
                    )}>
                      {selectedPacket.status === 'threat' ? 'malicious' : selectedPacket.status}
                    </span>
                  </p>
                  <p>Encrypted: {selectedPacket.encrypted ? 'true' : 'false'}</p>
                  <p>IP Address: {selectedPacket.ipAddress}</p>
                  <p>Timestamp: {new Date(selectedPacket.timestamp).toLocaleString()}</p>
                </div>
              ) : (
                <p className="text-sm text-[#9CA3AF]">Select a node or packet to inspect</p>
              )}
            </Card>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
