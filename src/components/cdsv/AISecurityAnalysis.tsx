import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import {
  Activity,
  AlertTriangle,
  Brain,
  CheckCircle2,
  Eye,
  FileText,
  Lock,
  ShieldAlert,
  Search,
  Shield,
  Trash2,
  X,
  XCircle,
  Zap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { cn } from '../shadcn/utils';

type FileStatus = 'safe' | 'suspicious' | 'dangerous' | 'quarantined';
type InsightSeverity = 'low' | 'medium' | 'high';

interface FileItem {
  id: string;
  name: string;
  status: FileStatus;
  riskScore: number;
  confidence: number;
  scannedAt: string;
}

interface Insight {
  id: string;
  severity: InsightSeverity;
  description: string;
}

function AnimatedNumber({ value }: { value: number }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    let frame = 0;
    const start = performance.now();
    const duration = 650;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(value * progress));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return <>{display}</>;
}

const initialFiles: FileItem[] = [
  { id: '1', name: 'quarterly_report_2026.pdf', status: 'safe', riskScore: 12, confidence: 98.7, scannedAt: '2026-04-17 10:12:05' },
  { id: '2', name: 'user_data_export.csv', status: 'suspicious', riskScore: 58, confidence: 76.3, scannedAt: '2026-04-17 09:58:11' },
  { id: '3', name: 'system_update.exe', status: 'dangerous', riskScore: 89, confidence: 94.2, scannedAt: '2026-04-17 09:40:54' },
];

function statusColor(status: FileStatus) {
  if (status === 'safe') return '#10B981';
  if (status === 'suspicious') return '#F59E0B';
  if (status === 'dangerous') return '#EF4444';
  return '#8B5CF6';
}

function statusBadge(status: FileStatus): 'secure' | 'warning' | 'danger' {
  if (status === 'safe' || status === 'quarantined') return 'secure';
  if (status === 'suspicious') return 'warning';
  return 'danger';
}

function normalizeStatus(score: number): FileStatus {
  if (score < 35) return 'safe';
  if (score < 70) return 'suspicious';
  return 'dangerous';
}

function buildInsights(file: FileItem): Insight[] {
  if (file.status === 'safe') {
    return [
      { id: 'i1', severity: 'low', description: 'No malware signatures detected across static and behavioral models.' },
      { id: 'i2', severity: 'low', description: 'Metadata and entropy patterns align with trusted baseline.' },
      { id: 'i3', severity: 'medium', description: 'Continue periodic monitoring under standard policy.' },
    ];
  }
  if (file.status === 'suspicious') {
    return [
      { id: 'i1', severity: 'medium', description: 'Anomalous payload structure detected in secondary chunks.' },
      { id: 'i2', severity: 'medium', description: 'Cross-user pattern overlap suggests manual analyst review.' },
      { id: 'i3', severity: 'high', description: 'Potential risk escalation if shared externally without encryption.' },
    ];
  }
  if (file.status === 'dangerous') {
    return [
      { id: 'i1', severity: 'high', description: 'Threat model matched known malicious family signatures.' },
      { id: 'i2', severity: 'high', description: 'Behavioral heuristics indicate command-and-control intent.' },
      { id: 'i3', severity: 'high', description: 'Immediate containment is recommended.' },
    ];
  }
  return [
    { id: 'i1', severity: 'low', description: 'File is quarantined and isolated from active workflows.' },
    { id: 'i2', severity: 'medium', description: 'Analyst can review in containment report mode.' },
  ];
}

function CircularMeter({ value, status }: { value: number; status: FileStatus }) {
  const size = 180;
  const stroke = 11;
  const radius = (size - stroke) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (value / 100) * circumference;
  const color = statusColor(status);

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth={stroke} />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 0.8 }}
        />
      </svg>
      <div className="absolute text-center">
        <p
          className="text-5xl font-extrabold tracking-tight"
          style={{ color: statusColor(status), textShadow: `0 0 16px ${statusColor(status)}40` }}
        >
          <AnimatedNumber value={value} />
        </p>
        <p className="text-xs uppercase tracking-wider text-[#9CA3AF]">Risk Score</p>
      </div>
    </div>
  );
}

function formatNow() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

export function AISecurityAnalysis() {
  const [files, setFiles] = useState<FileItem[]>(initialFiles);
  const [selectedFileId, setSelectedFileId] = useState<string | null>(initialFiles[0]?.id ?? null);
  const [loading, setLoading] = useState(false);
  const [scanModal, setScanModal] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const selectedFile = useMemo(() => files.find(file => file.id === selectedFileId) ?? null, [files, selectedFileId]);
  const selectedInsights = useMemo(() => (selectedFile ? buildInsights(selectedFile) : []), [selectedFile]);

  useEffect(() => {
    if (!selectedFile && files.length > 0) setSelectedFileId(files[0]?.id ?? null);
  }, [files, selectedFile]);

  const notify = (message: string) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  };

  const handleStartScan = () => {
    if (!pendingUpload) return;
    setLoading(true);
    setScanProgress(0);
    const timer = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(timer);
          return 100;
        }
        return prev + 8;
      });
    }, 180);

    setTimeout(() => {
      clearInterval(timer);
      const score = Math.floor(Math.random() * 100);
      const nextFile: FileItem = {
        id: Math.random().toString(36).slice(2, 10),
        name: pendingUpload.name,
        status: normalizeStatus(score),
        riskScore: score,
        confidence: Number((80 + Math.random() * 19).toFixed(1)),
        scannedAt: formatNow(),
      };
      setFiles(prev => [nextFile, ...prev]);
      setSelectedFileId(nextFile.id);
      setPendingUpload(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setLoading(false);
      setScanModal(false);
      notify('New AI scan completed');
    }, 2500);
  };

  const handleQuarantine = () => {
    if (!selectedFile) return;
    setFiles(prev => prev.map(file => (file.id === selectedFile.id ? { ...file, status: 'quarantined' } : file)));
    notify('File quarantined');
  };

  const handleDelete = () => {
    if (!selectedFile) return;
    setFiles(prev => prev.filter(file => file.id !== selectedFile.id));
    setConfirmDelete(false);
    notify('File deleted');
  };

  const disableAllExceptDelete = selectedFile?.status === 'quarantined';
  const quarantineDisabled = !selectedFile || selectedFile.status === 'safe' || selectedFile.status === 'quarantined';

  return (
    <div className="min-h-screen bg-[#0B0F1A] p-8 pb-32">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-[#8B5CF6]/10 p-3">
              <Brain className="h-6 w-6 text-[#8B5CF6]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#E5E7EB]">AI Security Analysis</h1>
              <p className="text-[#9CA3AF]">Machine learning-powered threat detection and triage.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="secure">
              <Activity className="mr-1 h-3 w-3" />
              AI Model v3.2.1
            </Badge>
            <Button variant="primary" className="gap-2" onClick={() => setScanModal(true)}>
              <Search className="h-4 w-4" />
              New Scan
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-[#E5E7EB]">Recent Scans</h2>
            {files.length === 0 ? (
              <Card glass className="text-center">
                <p className="text-sm text-[#9CA3AF]">No scanned files yet. Start a new scan.</p>
              </Card>
            ) : (
              <AnimatePresence>
                {files.map(file => (
                  <motion.div
                    key={file.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.015 }}
                    whileTap={{ scale: 0.995 }}
                  >
                    <Card
                      glass
                      className={cn(
                        'relative cursor-pointer transition-all hover:border-white/20 hover:shadow-[0_8px_24px_rgba(0,0,0,0.25)]',
                        selectedFile?.id === file.id && 'scale-[1.02] ring-2 ring-[#8B5CF6] shadow-[0_0_24px_rgba(139,92,246,0.35)]'
                      )}
                      onClick={() => setSelectedFileId(file.id)}
                    >
                      {selectedFile?.id === file.id && <div className="absolute bottom-3 left-0 top-3 w-1 rounded-r bg-[#8B5CF6]" />}
                      <div className="flex items-start gap-3 pl-1">
                        <div className="rounded-lg p-2" style={{ backgroundColor: `${statusColor(file.status)}25` }}>
                          {file.status === 'safe' ? (
                            <CheckCircle2 className="h-5 w-5 text-[#10B981]" />
                          ) : file.status === 'suspicious' ? (
                            <AlertTriangle className="h-5 w-5 text-[#F59E0B]" />
                          ) : file.status === 'dangerous' ? (
                            <XCircle className="h-5 w-5 text-[#EF4444]" />
                          ) : (
                            <Lock className="h-5 w-5 text-[#8B5CF6]" />
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-[#E5E7EB]">{file.name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <Badge variant={statusBadge(file.status)}>{file.status.toUpperCase()}</Badge>
                            <span className="text-xs text-[#9CA3AF]">{file.scannedAt}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>

          <div className="space-y-6 lg:col-span-2">
            {!selectedFile ? (
              <Card glass className="py-20 text-center">
                <p className="text-[#9CA3AF]">Select a scanned file to inspect AI findings.</p>
              </Card>
            ) : (
              <AnimatePresence mode="wait">
              <motion.div
                key={selectedFile.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.24, ease: 'easeOut' }}
                className="space-y-5"
              >
                <Card glass>
                  <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                    <div className="flex flex-col items-center justify-center p-4">
                      <CircularMeter value={selectedFile.riskScore} status={selectedFile.status} />
                      <div className="mt-5 text-center">
                        <Badge variant={statusBadge(selectedFile.status)}>{selectedFile.status.toUpperCase()}</Badge>
                        <p className="mt-2 text-sm text-[#9CA3AF]">Confidence: {selectedFile.confidence}%</p>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <p className="mb-2 text-xs uppercase text-[#9CA3AF]">File Information</p>
                        <div className="space-y-1 text-sm text-[#E5E7EB]">
                          <p>Name: {selectedFile.name}</p>
                          <p>Status: {selectedFile.status}</p>
                          <p>Risk Score: {selectedFile.riskScore}</p>
                          <p>Scanned At: {selectedFile.scannedAt}</p>
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                        <p className="mb-2 text-xs uppercase text-[#9CA3AF]">Confidence Signal</p>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-[#9CA3AF]">Model certainty</span>
                          <span className="font-semibold text-[#8B5CF6]">{selectedFile.confidence}%</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/10">
                          <motion.div
                            className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6]"
                            initial={{ width: 0 }}
                            animate={{ width: `${selectedFile.confidence}%` }}
                          />
                        </div>
                        <p className="mt-3 text-xs text-[#9CA3AF]">Last model update: live stream</p>
                      </div>
                      </div>
                      {loading ? (
                        <div className="space-y-2">
                          <div className="h-16 animate-pulse rounded-xl bg-white/5" />
                          <div className="h-16 animate-pulse rounded-xl bg-white/5" />
                        </div>
                      ) : (
                        <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
                          <p className="text-sm text-[#E5E7EB]">
                            {selectedFile.status === 'safe'
                              ? 'No immediate containment required.'
                              : selectedFile.status === 'suspicious'
                                ? 'Analyst review recommended before release.'
                                : selectedFile.status === 'dangerous'
                                  ? 'Immediate quarantine recommended.'
                                  : 'File has been quarantined and isolated.'}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </Card>

                <Card glass className="border border-[#8B5CF6]/20">
                  <CardHeader>
                    <CardTitle>AI Insights</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                      {selectedInsights.map(insight => (
                        <motion.div
                          key={insight.id}
                          whileHover={{ y: -2, scale: 1.015 }}
                          whileTap={{ scale: 0.99 }}
                          className={cn(
                            'rounded-xl border p-3 transition-all hover:shadow-[0_10px_22px_rgba(0,0,0,0.25)]',
                            insight.severity === 'low' && 'border-[#10B981]/30 bg-[#10B981]/10',
                            insight.severity === 'medium' && 'border-[#F59E0B]/30 bg-[#F59E0B]/10',
                            insight.severity === 'high' && 'border-[#EF4444]/35 bg-[#EF4444]/12 shadow-[0_0_16px_rgba(239,68,68,0.18)]'
                          )}
                        >
                          <div className="mb-2 flex items-center gap-2">
                            {insight.severity === 'low' ? (
                              <CheckCircle2 className="h-4 w-4 text-[#10B981]" />
                            ) : insight.severity === 'medium' ? (
                              <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />
                            ) : (
                              <ShieldAlert className="h-4 w-4 text-[#EF4444]" />
                            )}
                            <span className="text-xs uppercase tracking-wide text-[#9CA3AF]">{insight.severity}</span>
                          </div>
                          <p className="text-sm text-[#E5E7EB]">{insight.description}</p>
                        </motion.div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              </AnimatePresence>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedFile && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-white/15 bg-[#0B0F1A]/80 px-6 py-2.5 shadow-[0_-10px_28px_rgba(0,0,0,0.32)] backdrop-blur-xl"
          >
            <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: statusColor(selectedFile.status) }}
                />
                <p className="text-xs text-[#9CA3AF]">
                  Selected: <span className="font-medium text-[#E5E7EB]">{selectedFile.name}</span>
                </p>
                <Badge variant={statusBadge(selectedFile.status)}>{selectedFile.status.toUpperCase()}</Badge>
                <span className="text-[11px] text-[#9CA3AF]">
                  Risk: <span className="font-semibold text-[#E5E7EB]"><AnimatedNumber value={selectedFile.riskScore} /></span>
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {selectedFile.status === 'suspicious' && (
                  <Button variant="secondary" size="sm" className="gap-1.5" disabled={disableAllExceptDelete}>
                    <Eye className="h-4 w-4" />
                    Review
                  </Button>
                )}
                <Button
                  variant={selectedFile.status === 'dangerous' ? 'danger' : 'primary'}
                  size="sm"
                  className="gap-1.5"
                  disabled={quarantineDisabled || disableAllExceptDelete}
                  onClick={handleQuarantine}
                >
                  <Lock className="h-4 w-4" />
                  Quarantine File
                </Button>
                <Button variant="secondary" size="sm" className="gap-1.5" disabled={disableAllExceptDelete} onClick={() => setReportModal(true)}>
                  <Eye className="h-4 w-4" />
                  View Full Report
                </Button>
                <Button variant="danger" size="sm" className="gap-1.5" onClick={() => setConfirmDelete(true)}>
                  <Trash2 className="h-4 w-4" />
                  Delete
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {scanModal && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !loading && setScanModal(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="fixed left-1/2 top-1/2 z-[60] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-white/10 bg-[#111827] p-5"
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#E5E7EB]">Start New AI Scan</h3>
                <button onClick={() => !loading && setScanModal(false)} className="rounded-lg p-2 text-[#9CA3AF] hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                className="w-full rounded-xl border border-white/10 bg-white/5 p-3 text-sm text-[#E5E7EB]"
                onChange={e => setPendingUpload(e.target.files?.[0] ?? null)}
              />
              {pendingUpload && <p className="mt-2 text-xs text-[#9CA3AF]">Selected: {pendingUpload.name}</p>}
              {loading && (
                <div className="mt-4 rounded-xl border border-[#8B5CF6]/30 bg-[#8B5CF6]/10 p-3">
                  <div className="mb-2 flex items-center justify-between text-sm text-[#E5E7EB]">
                    <span>AI scanning in progress...</span>
                    <span>{scanProgress}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-white/10">
                    <motion.div className="h-full bg-gradient-to-r from-[#8B5CF6] to-[#3B82F6]" animate={{ width: `${scanProgress}%` }} />
                  </div>
                </div>
              )}
              <div className="mt-5 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setScanModal(false)} disabled={loading}>Cancel</Button>
                <Button variant="primary" onClick={handleStartScan} disabled={!pendingUpload || loading}>
                  {loading ? 'Scanning...' : 'Run Scan'}
                </Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {reportModal && selectedFile && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setReportModal(false)}
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              className="fixed right-0 top-0 z-[60] h-screen w-full max-w-lg overflow-y-auto border-l border-white/10 bg-[#0F172A] p-6"
            >
              <div className="mb-5 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-[#E5E7EB]">Full AI Report</h3>
                <button onClick={() => setReportModal(false)} className="rounded-lg p-2 text-[#9CA3AF] hover:bg-white/10">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="space-y-4">
                <Card glass>
                  <CardContent>
                    <p className="text-sm text-[#9CA3AF]">Risk Score</p>
                    <p className="text-3xl font-bold text-[#E5E7EB]">{selectedFile.riskScore}</p>
                  </CardContent>
                </Card>
                <Card glass>
                  <CardHeader><CardTitle>Technical Overview</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-[#E5E7EB]">
                      <p>File: {selectedFile.name}</p>
                      <p>Status: {selectedFile.status}</p>
                      <p>Confidence: {selectedFile.confidence}%</p>
                      <p>Timeline: Upload → AI Scan → Classification</p>
                    </div>
                  </CardContent>
                </Card>
                <Card glass>
                  <CardHeader><CardTitle>AI Insights</CardTitle></CardHeader>
                  <CardContent>
                    <div className="space-y-2 text-sm text-[#E5E7EB]">
                      {selectedInsights.map(item => (
                        <div key={item.id} className="rounded-lg bg-white/5 p-2">{item.description}</div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {confirmDelete && selectedFile && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setConfirmDelete(false)}
            />
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.98 }}
              className="fixed left-1/2 top-1/2 z-[60] w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#EF4444]/35 bg-[#111827] p-5"
            >
              <h3 className="text-lg font-semibold text-[#E5E7EB]">Delete File?</h3>
              <p className="mt-2 text-sm text-[#9CA3AF]">This action removes the scan result permanently.</p>
              <div className="mt-5 flex justify-end gap-3">
                <Button variant="secondary" onClick={() => setConfirmDelete(false)}>Cancel</Button>
                <Button variant="danger" onClick={handleDelete}>Delete</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="fixed bottom-24 right-6 z-[70] rounded-xl border border-[#10B981]/30 bg-[#052E1A] px-4 py-2.5 text-sm text-[#D1FAE5]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
