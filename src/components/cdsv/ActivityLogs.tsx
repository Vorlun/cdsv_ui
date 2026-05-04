import { useMemo, useState } from "react";
import { AnimatePresence, motion } from 'motion/react';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Copy,
  Clock,
  Download,
  Globe,
  Loader2,
  ScrollText,
  Search,
  Shield,
  User,
  XCircle,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSecurityLogs } from '@/hooks/useSecurityLogs';
import { sanitizePlainText } from '@/utils/sanitize';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { cn } from '../shadcn/utils';
import { PageSpinner } from '@/components/feedback/PageSpinner';
import { ErrorBanner } from '@/components/feedback/ErrorBanner';
import { EmptyState } from '@/components/feedback/EmptyState';

type LogStatus = 'all' | 'success' | 'warning' | 'error' | 'info';

export function ActivityLogs() {
  const navigate = useNavigate();
  const {
    items: logItems,
    status: logsLoadStatus,
    error: logsLoadError,
    reload: reloadLogs,
  } = useSecurityLogs();
  const [selectedFilter, setSelectedFilter] = useState<LogStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ipFilter, setIpFilter] = useState('');
  const [userFilter, setUserFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [warningModalLogId, setWarningModalLogId] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [exportMode, setExportMode] = useState<'filtered' | 'all'>('filtered');
  const [isExporting, setIsExporting] = useState(false);
  const [tooltipIpId, setTooltipIpId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  const filteredLogs = useMemo(() => {
    return logItems.filter((log) => {
      const matchesStatus = selectedFilter === 'all' || log.status === selectedFilter;
      const matchesSearch =
        log.user.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        log.resource.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesIp = ipFilter ? log.ip.toLowerCase().includes(ipFilter.toLowerCase()) : true;
      const matchesUser = userFilter ? log.user.toLowerCase().includes(userFilter.toLowerCase()) : true;
      const logDate = log.timestamp.slice(0, 10);
      const matchesDateFrom = dateFrom ? logDate >= dateFrom : true;
      const matchesDateTo = dateTo ? logDate <= dateTo : true;
      return matchesStatus && matchesSearch && matchesIp && matchesUser && matchesDateFrom && matchesDateTo;
    });
  }, [logItems, selectedFilter, searchQuery, ipFilter, userFilter, dateFrom, dateTo]);

  const selectedWarningLog =
    logItems.find((log) => log.id === warningModalLogId) ?? null;

  const getStatusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle2 className="h-4 w-4 text-[#10B981]" />;
    if (status === 'warning') return <AlertTriangle className="h-4 w-4 text-[#F59E0B]" />;
    if (status === 'error') return <XCircle className="h-4 w-4 text-[#EF4444]" />;
    return <Shield className="h-4 w-4 text-[#3B82F6]" />;
  };

  const getStatusBadge = (status: string) => {
    if (status === 'success') return <Badge variant="secure">Success</Badge>;
    if (status === 'warning') return <Badge variant="warning">Warning</Badge>;
    if (status === 'error') return <Badge variant="danger">Error</Badge>;
    return <Badge variant="secure">Info</Badge>;
  };

  const handleRowClick = (logId: string) => {
    const log = logItems.find((entry) => entry.id === logId);
    if (!log) return;
    setSelectedRowId(logId);
    if (log.status === 'warning') {
      setWarningModalLogId(logId);
      return;
    }
    if (log.status === 'error') {
      navigate(`/logs/${logId}`);
      return;
    }
  };

  const exportFile = async (type: 'csv' | 'json') => {
    setIsExporting(true);
    try {
      const source = exportMode === 'all' ? logItems : filteredLogs;
      const filename = `activity-logs-${new Date().toISOString().slice(0, 10)}.${type}`;
      const blob =
        type === 'json'
          ? new Blob([JSON.stringify(source, null, 2)], { type: 'application/json' })
          : new Blob(
              [
                [
                  'id,timestamp,user,action,resource,status,ip,details',
                  ...source.map(
                    row =>
                      `${row.id},"${row.timestamp}","${row.user}","${row.action}","${row.resource}","${row.status}","${row.ip}","${row.details}"`
                  ),
                ].join('\n'),
              ],
              { type: 'text/csv' }
            );
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = filename;
      await new Promise(resolve => window.setTimeout(resolve, 650));
      anchor.click();
      URL.revokeObjectURL(url);
      setToast({
        type: 'success',
        message: `${type.toUpperCase()} export complete (${exportMode === 'all' ? 'all logs' : 'filtered logs'})`,
      });
      setExportOpen(false);
    } catch {
      setToast({ type: 'info', message: 'Export failed. Please retry.' });
    } finally {
      setIsExporting(false);
    }
  };

  const copyIp = async (ip: string, id: string) => {
    try {
      await navigator.clipboard.writeText(ip);
      setTooltipIpId(id);
      setToast({ type: 'info', message: `IP ${ip} copied` });
      window.setTimeout(() => setTooltipIpId(current => (current === id ? null : current)), 1400);
    } catch {
      setToast({ type: 'info', message: 'Clipboard unavailable. Copy manually.' });
    }
  };

  if (logsLoadStatus === "loading") {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center bg-[#0B0F1A] p-8">
        <PageSpinner label="Loading audit events" />
      </div>
    );
  }

  if (logsLoadStatus === "error") {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <ErrorBanner
          title="Unable to load activity logs"
          message={logsLoadError ?? "Unknown error"}
          onRetry={() => void reloadLogs()}
        />
      </div>
    );
  }

  if (logItems.length === 0 && logsLoadStatus === "ready") {
    return (
      <div className="mx-auto max-w-3xl p-8">
        <EmptyState
          title="No security events"
          description="The audit feed returned no records. Retry or verify downstream SIEM connectivity."
          action={
            <Button variant="secondary" onClick={() => void reloadLogs()}>
              Refresh feed
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-[#E5E7EB]">Activity Logs</h1>
              <p className="text-[#9CA3AF]">Real-time SIEM event stream with SOC-grade filtering.</p>
            </div>
            <div className="relative">
              <Button variant="secondary" className="gap-2" onClick={() => setExportOpen(prev => !prev)}>
                <Download className="h-4 w-4" />
                Export
                <ChevronDown className="h-4 w-4" />
              </Button>
              <AnimatePresence>
                {exportOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 8 }}
                    className="absolute right-0 z-20 mt-2 w-44 rounded-xl border border-white/10 bg-[#111827] p-2 shadow-2xl"
                  >
                    <div className="mb-1 rounded-lg border border-white/10 bg-white/5 p-1">
                      <button
                        onClick={() => setExportMode('filtered')}
                        className={cn('w-full rounded-md px-2 py-1 text-left text-xs', exportMode === 'filtered' ? 'bg-[#3B82F6]/20 text-[#DBEAFE]' : 'text-[#9CA3AF] hover:bg-white/10')}
                      >
                        Export filtered
                      </button>
                      <button
                        onClick={() => setExportMode('all')}
                        className={cn('w-full rounded-md px-2 py-1 text-left text-xs', exportMode === 'all' ? 'bg-[#3B82F6]/20 text-[#DBEAFE]' : 'text-[#9CA3AF] hover:bg-white/10')}
                      >
                        Export all
                      </button>
                    </div>
                    <button disabled={isExporting} onClick={() => exportFile('csv')} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[#E5E7EB] hover:bg-white/10 disabled:opacity-60">
                      Export CSV
                      {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    </button>
                    <button disabled={isExporting} onClick={() => exportFile('json')} className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm text-[#E5E7EB] hover:bg-white/10 disabled:opacity-60">
                      Export JSON
                      {isExporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-4">
            <Card glass className="border border-[#10B981]/20">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#10B981]/10 p-2"><CheckCircle2 className="h-5 w-5 text-[#10B981]" /></div>
                <div><p className="text-2xl font-bold text-[#E5E7EB]">{logItems.filter((l) => l.status === 'success').length}</p><p className="text-xs text-[#9CA3AF]">Successful</p></div>
              </div>
            </Card>
            <Card glass className="border border-[#F59E0B]/20">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#F59E0B]/10 p-2"><AlertTriangle className="h-5 w-5 text-[#F59E0B]" /></div>
                <div><p className="text-2xl font-bold text-[#E5E7EB]">{logItems.filter((l) => l.status === 'warning').length}</p><p className="text-xs text-[#9CA3AF]">Warnings</p></div>
              </div>
            </Card>
            <Card glass className="border border-[#EF4444]/20">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#EF4444]/10 p-2"><XCircle className="h-5 w-5 text-[#EF4444]" /></div>
                <div><p className="text-2xl font-bold text-[#E5E7EB]">{logItems.filter((l) => l.status === 'error').length}</p><p className="text-xs text-[#9CA3AF]">Errors</p></div>
              </div>
            </Card>
            <Card glass className="border border-[#3B82F6]/20">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-[#3B82F6]/10 p-2"><Shield className="h-5 w-5 text-[#3B82F6]" /></div>
                <div><p className="text-2xl font-bold text-[#E5E7EB]">{logItems.length}</p><p className="text-xs text-[#9CA3AF]">Total Events</p></div>
              </div>
            </Card>
          </div>

          <Card glass>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-6">
              <div className="lg:col-span-2 relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search action/resource..."
                  className="w-full rounded-lg border border-white/10 bg-[#1F2937] py-2 pl-10 pr-3 text-sm text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>
              <select
                value={selectedFilter}
                onChange={e => setSelectedFilter(e.target.value as LogStatus)}
                className="rounded-lg border border-white/10 bg-[#1F2937] px-3 py-2 text-sm text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              >
                <option value="all">All Status</option>
                <option value="success">Success</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="info">Info</option>
              </select>
              <input
                type="text"
                value={ipFilter}
                onChange={e => setIpFilter(e.target.value)}
                placeholder="Filter by IP"
                className="rounded-lg border border-white/10 bg-[#1F2937] px-3 py-2 text-sm text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              />
              <input
                type="text"
                value={userFilter}
                onChange={e => setUserFilter(e.target.value)}
                placeholder="Filter by user"
                className="rounded-lg border border-white/10 bg-[#1F2937] px-3 py-2 text-sm text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={e => setDateFrom(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#1F2937] px-2 py-2 text-xs text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
                <input
                  type="date"
                  value={dateTo}
                  onChange={e => setDateTo(e.target.value)}
                  className="rounded-lg border border-white/10 bg-[#1F2937] px-2 py-2 text-xs text-[#E5E7EB] focus:outline-none focus:ring-2 focus:ring-[#3B82F6]"
                />
              </div>
            </div>
          </Card>
        </div>

        <Card glass>
          <div className="max-h-[560px] overflow-auto">
            <table className="w-full">
              <thead className="sticky top-0 z-10 bg-[#0F172A]/95 backdrop-blur">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#9CA3AF]">Status</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#9CA3AF]">Timestamp</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#9CA3AF]">User</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#9CA3AF]">Action</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#9CA3AF]">Resource</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-[#9CA3AF]">IP Address</th>
                </tr>
              </thead>
              <tbody>
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="rounded-full bg-white/5 p-4"><ScrollText className="h-8 w-8 text-[#9CA3AF]" /></div>
                        <div>
                          <p className="text-sm font-medium text-[#E5E7EB]">No logs found</p>
                          <p className="text-xs text-[#9CA3AF]">Try adjusting filters.</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map((log, index) => (
                    <motion.tr
                      key={log.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.02 }}
                      onClick={() => handleRowClick(log.id)}
                      className={cn(
                        'cursor-pointer border-b border-white/5 transition-all hover:bg-white/5',
                        selectedRowId === log.id && 'bg-[#3B82F6]/10'
                      )}
                    >
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <motion.span
                            className="h-2 w-2 rounded-full"
                            animate={{ opacity: [1, 0.45, 1] }}
                            transition={{ duration: 1.6, repeat: Infinity }}
                            style={{
                              background:
                                log.status === 'success'
                                  ? '#10B981'
                                  : log.status === 'warning'
                                    ? '#F59E0B'
                                    : log.status === 'error'
                                      ? '#EF4444'
                                      : '#3B82F6',
                            }}
                          />
                          {getStatusIcon(log.status)}
                          {getStatusBadge(log.status)}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-[#9CA3AF]" />
                          <span className="font-mono text-sm text-[#E5E7EB]">{log.timestamp.replace('T', ' ').replace('Z', '')}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-[#9CA3AF]" />
                          <span className="text-sm text-[#E5E7EB]">{log.user}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-[#E5E7EB]">{log.action}</td>
                      <td className="px-4 py-4 text-sm text-[#9CA3AF]">{log.resource}</td>
                      <td className="px-4 py-4">
                        <div className="relative flex items-center gap-2">
                          <Globe className="h-4 w-4 text-[#9CA3AF]" />
                          <span className="font-mono text-sm text-[#9CA3AF]">{log.ip}</span>
                          <button
                            type="button"
                            onClick={event => {
                              event.stopPropagation();
                              copyIp(log.ip, log.id);
                            }}
                            onMouseEnter={() => setTooltipIpId(log.id)}
                            onMouseLeave={() => setTooltipIpId(null)}
                            className="rounded p-1 text-[#9CA3AF] transition hover:bg-white/10 hover:text-[#E5E7EB]"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          <AnimatePresence>
                            {tooltipIpId === log.id && (
                              <motion.div
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 6 }}
                                className="absolute -top-9 left-8 rounded-md border border-white/10 bg-[#111827] px-2 py-1 text-[11px] text-[#CBD5E1]"
                              >
                                Click to copy IP
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </td>
                    </motion.tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredLogs.length > 0 && (
            <div className="flex items-center justify-between border-t border-white/10 px-4 py-4">
              <p className="text-sm text-[#9CA3AF]">Showing {filteredLogs.length} of {logItems.length} entries</p>
              <div className="text-xs text-[#9CA3AF]">Click warning rows for details. Error rows open incident page.</div>
            </div>
          )}
        </Card>
      </div>

      <AnimatePresence>
        {selectedWarningLog && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setWarningModalLogId(null)}
            />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              className="fixed left-1/2 top-1/2 z-[60] w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-2xl border border-[#F59E0B]/40 bg-[#111827] p-5"
            >
              <h3 className="text-lg font-semibold text-[#E5E7EB]">Warning Log Details</h3>
              <div className="mt-4 space-y-2 text-sm text-[#E5E7EB]">
                <p><span className="text-[#9CA3AF]">Event:</span> {selectedWarningLog.action}</p>
                <p><span className="text-[#9CA3AF]">User:</span> {selectedWarningLog.user}</p>
                <p><span className="text-[#9CA3AF]">IP:</span> {selectedWarningLog.ip}</p>
                <p><span className="text-[#9CA3AF]">Timestamp:</span> {selectedWarningLog.timestamp.replace('T', ' ').replace('Z', '')}</p>
                <p><span className="text-[#9CA3AF]">Threat Type:</span> {selectedWarningLog.threatType}</p>
                <p><span className="text-[#9CA3AF]">System Response:</span> {selectedWarningLog.responseAction}</p>
                <p><span className="text-[#9CA3AF]">Details:</span> {selectedWarningLog.details}</p>
              </div>
              <div className="mt-5 flex justify-end">
                <Button variant="secondary" onClick={() => setWarningModalLogId(null)}>Close</Button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            onAnimationComplete={() => {
              window.setTimeout(() => setToast(null), 1500);
            }}
            className={`fixed bottom-5 right-5 z-[80] rounded-xl border px-4 py-3 text-sm shadow-lg ${
              toast.type === 'success'
                ? 'border-[#10B981]/40 bg-[#064E3B]/80 text-[#D1FAE5]'
                : 'border-[#3B82F6]/40 bg-[#1E3A8A]/70 text-[#DBEAFE]'
            }`}
          >
            {toast.message}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
