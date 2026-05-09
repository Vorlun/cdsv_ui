import {
  lazy,
  memo,
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useSearchParams } from "react-router-dom";
import { motion } from "motion/react";
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ChevronLeft,
  ChevronRight,
  Download,
  FileText,
  Filter,
  Loader2,
  MoreHorizontal,
  Network,
  Radar,
  RefreshCw,
  ScanSearch,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UploadCloud,
  X,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { socApi, subscribeSocStream } from "@/services/apiClient";
import { normalizeSocError } from "@/services/apiErrorHandler";
import {
  formatBytes,
  formatDate,
  malwareBreakdownFromAnalytics,
  scanBadgeClasses,
  threatBadgeClasses,
  threatDistributionFromAnalytics,
  threatDistributionFromFiles,
  truncate,
} from "@/features/admin-upload-monitoring/uploadMonitoringUtils";

const UploadForensicDrawer = lazy(() => import("@/features/admin-upload-monitoring/UploadForensicDrawer.jsx"));

const ROW_HEIGHT = 52;
const WS_REFRESH_MS = 520;

function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const p = payload[0];
  const value = p?.value;
  const series = p?.name ?? "count";
  return (
    <div className="rounded-lg border border-white/15 bg-[#0b1220]/95 px-2.5 py-2 text-[11px] shadow-xl backdrop-blur-sm">
      <div className="font-semibold text-slate-200">{label}</div>
      <div className="mt-1 text-cyan-200/90">
        {series}: <span className="font-mono text-white">{value}</span>
      </div>
    </div>
  );
}

function SortHead({ label, field, sort, sortDir, onSort, className }) {
  const active = sort === field;
  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className={`group inline-flex items-center gap-1 text-left transition hover:text-slate-200 ${active ? "text-cyan-200" : ""} ${className ?? ""}`}
    >
      {label}
      {active ? sortDir === "asc" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" /> : null}
    </button>
  );
}

const UploadRow = memo(function UploadRow({
  file,
  selected,
  flash,
  onOpenRow,
  onQuickDownload,
  onQuickDelete,
}) {
  const pendingScan =
    String(file.malwareScanStatus ?? "")
      .toLowerCase()
      .includes("pending") ||
    String(file.malwareScanStatus ?? "").toLowerCase().includes("queued");

  return (
    <motion.tr
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      onClick={() => onOpenRow(file, "overview")}
      className={`group cursor-pointer border-b border-white/[0.04] transition hover:bg-cyan-500/[0.04] ${
        selected ? "bg-cyan-500/[0.07] shadow-[inset_0_0_0_1px_rgba(34,211,238,0.35)]" : ""
      } ${flash ? "shadow-[inset_0_0_0_1px_rgba(52,211,153,0.45)]" : ""}`}
    >
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <FileText className="h-3.5 w-3.5 shrink-0 text-slate-500" />
          <span className="font-mono text-[11px] text-slate-100" title={file.name}>
            {truncate(file.name, 26)}
          </span>
          {pendingScan ? <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-sky-400" aria-label="Scanning" /> : null}
        </div>
      </td>
      <td className="hidden px-3 py-2 md:table-cell">
        <div>
          <p className="text-[11px] font-medium text-slate-200">{file.owner?.fullName ?? "—"}</p>
          <p className="text-[10px] text-slate-500">{truncate(file.owner?.email, 28)}</p>
        </div>
      </td>
      <td className="hidden px-3 py-2 font-mono text-[11px] text-slate-400 lg:table-cell">{formatBytes(file.size)}</td>
      <td className="hidden px-3 py-2 text-[11px] text-slate-400 xl:table-cell">{formatDate(file.uploadDate)}</td>
      <td className="px-3 py-2">
        <span
          className={`inline-flex rounded border px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${threatBadgeClasses(file.threatLevel)}`}
        >
          {file.threatLevel ?? "none"}
        </span>
      </td>
      <td className="hidden px-3 py-2 lg:table-cell">
        <span className={`rounded border px-1.5 py-0.5 text-[10px] ${scanBadgeClasses(file.malwareScanStatus)}`}>
          {file.malwareScanStatus ? truncate(file.malwareScanStatus, 14) : "pending"}
        </span>
      </td>
      <td className="hidden px-3 py-2 text-[10px] text-slate-400 xl:table-cell">
        {file.encryptionStatus ? truncate(file.encryptionStatus, 14) : "—"}
      </td>
      <td className="hidden px-3 py-2 2xl:table-cell">
        {file.sha256 ? (
          <span className="font-mono text-[10px] text-slate-500" title={file.sha256}>
            {file.sha256.slice(0, 10)}…
          </span>
        ) : (
          "—"
        )}
      </td>
      <td className="px-2 py-2 text-right">
        <div className="flex justify-end gap-1 opacity-100 transition md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
          <button
            type="button"
            className="rounded-md border border-white/10 bg-white/[0.03] p-1.5 text-slate-400 hover:bg-white/[0.07] hover:text-white"
            title="Inspect"
            onClick={(e) => {
              e.stopPropagation();
              onOpenRow(file, "security");
            }}
          >
            <ScanSearch className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-md border border-white/10 bg-white/[0.03] p-1.5 text-slate-400 hover:bg-white/[0.07] hover:text-white"
            title="Trace"
            onClick={(e) => {
              e.stopPropagation();
              onOpenRow(file, "timeline");
            }}
          >
            <Network className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-md border border-white/10 bg-white/[0.03] p-1.5 text-slate-400 hover:bg-white/[0.07] hover:text-white"
            title="Download"
            onClick={(e) => {
              e.stopPropagation();
              void onQuickDownload(file.id);
            }}
          >
            <Download className="h-3.5 w-3.5" />
          </button>
          <button
            type="button"
            className="rounded-md border border-rose-500/20 bg-rose-500/[0.06] p-1.5 text-rose-300 hover:bg-rose-500/15"
            title="Delete"
            onClick={(e) => {
              e.stopPropagation();
              void onQuickDelete(file);
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </motion.tr>
  );
});

function useDebouncedWsRefresh(fetchSilent) {
  const tRef = useRef(null);
  const schedule = useCallback(() => {
    if (tRef.current) clearTimeout(tRef.current);
    tRef.current = setTimeout(() => {
      tRef.current = null;
      void fetchSilent();
    }, WS_REFRESH_MS);
  }, [fetchSilent]);
  useEffect(
    () => () => {
      if (tRef.current) clearTimeout(tRef.current);
    },
    [],
  );
  return schedule;
}

export default function AdminUploadActivityPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [files, setFiles] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [search, setSearch] = useState("");
  const [threatFilter, setThreatFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [encryptedOnly, setEncryptedOnly] = useState(false);
  const [suspiciousOnly, setSuspiciousOnly] = useState(false);
  const [sort, setSort] = useState("uploadDate");
  const [sortDir, setSortDir] = useState("desc");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastRefresh, setLastRefresh] = useState(null);
  const [analytics, setAnalytics] = useState(null);
  const [livePulse, setLivePulse] = useState(false);
  const [highlightId, setHighlightId] = useState(null);
  const [drawer, setDrawer] = useState({ open: false, id: null, tab: "overview", snapshot: null });

  const scrollRef = useRef(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportH, setViewportH] = useState(360);
  const timerRef = useRef(null);
  const searchTimer = useRef(null);
  const prevHeadRef = useRef(null);
  const analyticsTimerRef = useRef(null);

  const qParam = searchParams.get("q");
  useEffect(() => {
    const next = qParam ?? "";
    setSearch((prev) => (prev === next ? prev : next));
    setPage(1);
  }, [qParam]);

  useEffect(() => {
    setSearchParams(
      (prev) => {
        const sp = new URLSearchParams(prev);
        const next = search.trim();
        const cur = sp.get("q") ?? "";
        if (cur === next) return prev;
        if (next) sp.set("q", next);
        else sp.delete("q");
        return sp;
      },
      { replace: true },
    );
  }, [search, setSearchParams]);

  const fetchSilentBase = useCallback(async () => {
    setError(null);
    try {
      const params = {
        page: String(page),
        pageSize: String(pageSize),
        ...(search.trim() ? { search: search.trim() } : {}),
        ...(threatFilter ? { threatLevel: threatFilter } : {}),
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
        ...(ownerEmail.trim() ? { ownerEmail: ownerEmail.trim() } : {}),
        ...(encryptedOnly ? { encryptedOnly: "true" } : {}),
        ...(suspiciousOnly ? { suspiciousOnly: "true" } : {}),
        ...(sort ? { sort } : {}),
        ...(sortDir ? { sortDir } : {}),
      };
      const res = await socApi.uploadsCatalog(params);
      setFiles(Array.isArray(res?.data) ? res.data : []);
      setTotal(res?.total ?? 0);
      setLastRefresh(new Date());

      const head = res?.data?.[0]?.id;
      if (page === 1 && head && prevHeadRef.current && head !== prevHeadRef.current) {
        setHighlightId(head);
        window.setTimeout(() => setHighlightId(null), 2800);
      }
      prevHeadRef.current = head ?? prevHeadRef.current;

      setLivePulse(true);
      window.setTimeout(() => setLivePulse(false), 900);
    } catch (e) {
      setError(normalizeSocError(e).message);
    }
  }, [
    page,
    pageSize,
    search,
    threatFilter,
    dateFrom,
    dateTo,
    ownerEmail,
    encryptedOnly,
    suspiciousOnly,
    sort,
    sortDir,
  ]);

  const fetch = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      await fetchSilentBase();
      if (!silent) setLoading(false);
    },
    [fetchSilentBase],
  );

  const fetchSilent = useCallback(async () => {
    await fetchSilentBase();
  }, [fetchSilentBase]);

  const scheduleWsRefresh = useDebouncedWsRefresh(fetchSilent);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      void fetch();
    }, 280);
    return () => clearTimeout(searchTimer.current);
  }, [fetch]);

  useEffect(() => {
    timerRef.current = setInterval(() => void fetchSilent(), 30_000);
    return () => clearInterval(timerRef.current);
  }, [fetchSilent]);

  useEffect(() => {
    const unsub = subscribeSocStream((ev) => {
      const t = String(ev?.type ?? "").toLowerCase();
      const stage = String(ev?.stage ?? "").toLowerCase();
      if (
        t.includes("upload") ||
        stage.includes("upload") ||
        stage.includes("encryption") ||
        stage.includes("malware") ||
        stage.includes("integrity")
      ) {
        scheduleWsRefresh();
      }
    });
    return unsub;
  }, [scheduleWsRefresh]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const a = await socApi.adminAnalytics();
        if (!cancelled) setAnalytics(a);
      } catch {
        if (!cancelled) setAnalytics(null);
      }
    };
    load();
    analyticsTimerRef.current = setInterval(load, 120_000);
    return () => {
      cancelled = true;
      clearInterval(analyticsTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(() => setViewportH(el.clientHeight));
    ro.observe(el);
    setViewportH(el.clientHeight);
    return () => ro.disconnect();
  }, [files.length]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = 0;
    setScrollTop(0);
  }, [page, pageSize, sort, sortDir, threatFilter, search, dateFrom, dateTo, ownerEmail, encryptedOnly, suspiciousOnly]);

  const threatDist = useMemo(() => {
    const fromA = threatDistributionFromAnalytics(analytics);
    if (fromA.length) return fromA;
    return threatDistributionFromFiles(files);
  }, [analytics, files]);

  const scanDist = useMemo(() => {
    const fromA = malwareBreakdownFromAnalytics(analytics);
    if (fromA.length) return fromA;
    const tally = {};
    for (const f of files) {
      const k = f.malwareScanStatus || "unknown";
      tally[k] = (tally[k] ?? 0) + 1;
    }
    return Object.entries(tally).map(([name, count], i) => ({
      name,
      count,
      color: ["#38BDF8", "#A78BFA", "#FBBF24", "#FB7185"][i % 4],
    }));
  }, [analytics, files]);

  const platformWide = !search.trim() && !threatFilter && !dateFrom && !dateTo && !ownerEmail.trim() && !encryptedOnly && !suspiciousOnly;

  const statsCards = useMemo(() => {
    const critHigh =
      analytics?.threatLevelDistribution
        ?.filter((x) => /critical|high/i.test(String(x.level)))
        .reduce((a, x) => a + (Number(x.count) || 0), 0) ?? null;

    return [
      {
        label: platformWide ? "Vault artifacts" : "Matching records",
        value: platformWide ? analytics?.totalUploads ?? total : total,
        icon: UploadCloud,
        color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20",
        hint: platformWide ? "platform total" : "filtered catalogue",
      },
      {
        label: "Critical / High",
        value: platformWide ? critHigh ?? "—" : files.filter((f) => ["critical", "high"].includes(String(f.threatLevel).toLowerCase())).length,
        icon: ShieldAlert,
        color: "text-red-400 bg-red-400/10 border-red-400/20",
        hint: platformWide ? "platform-wide" : "this page",
      },
      {
        label: "SOC telemetry threats",
        value: analytics?.totalThreats ?? "—",
        icon: Radar,
        color: "text-amber-400 bg-amber-400/10 border-amber-400/20",
        hint: "correlated analyses",
      },
      {
        label: "AES secured",
        value: platformWide ? analytics?.totalUploads ?? total : files.filter((f) => String(f.encryptionStatus).toLowerCase().includes("aes")).length,
        icon: ShieldCheck,
        color: "text-emerald-400 bg-emerald-400/10 border-emerald-400/20",
        hint: platformWide ? "vault commits" : "page subset",
      },
    ];
  }, [analytics, files, platformWide, total]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const virtual = useMemo(() => {
    const n = files.length;
    if (n === 0) return { start: 0, end: 0, padTop: 0, padBottom: 0, slice: [] };
    const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 6);
    const vis = Math.ceil(viewportH / ROW_HEIGHT) + 14;
    const end = Math.min(n, start + vis);
    const padTop = start * ROW_HEIGHT;
    const padBottom = Math.max(0, (n - end) * ROW_HEIGHT);
    return { start, end, padTop, padBottom, slice: files.slice(start, end) };
  }, [files, scrollTop, viewportH]);

  const sortColumn = useCallback((field) => {
    setPage(1);
    if (sort !== field) {
      setSort(field);
      setSortDir("desc");
    } else {
      setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    }
  }, [sort]);

  const openDrawer = useCallback((file, tab = "overview") => {
    setDrawer({ open: true, id: file.id, tab, snapshot: file });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawer((d) => ({ ...d, open: false }));
  }, []);

  const blobDownload = useCallback((blob, filename) => {
    const url = URL.createObjectURL(blob);
    try {
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } finally {
      URL.revokeObjectURL(url);
    }
  }, []);

  const quickDownload = useCallback(
    async (id) => {
      try {
        const { blob, contentDisposition } = await socApi.uploadDownloadBlob(id);
        const m = contentDisposition && /filename="([^"]+)"/i.exec(contentDisposition);
        const name = m?.[1] ? decodeURIComponent(m[1]) : `${id}_forensic.bin`;
        blobDownload(blob, name);
      } catch (e) {
        setError(normalizeSocError(e).message);
      }
    },
    [blobDownload],
  );

  const quickDelete = useCallback(
    async (file) => {
      if (!window.confirm(`Delete ${file.name}?`)) return;
      try {
        await socApi.uploadDelete(file.id);
        await fetchSilent();
      } catch (e) {
        setError(normalizeSocError(e).message);
      }
    },
    [fetchSilent],
  );

  const donutTotal = scanDist.reduce((a, x) => a + x.count, 0);

  return (
    <div className="min-h-full space-y-4 bg-[#050810] p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold tracking-tight text-white md:text-xl">Upload Monitoring</h1>
            {livePulse ? (
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-emerald-300">
                Live
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 max-w-xl text-xs leading-relaxed text-slate-500">
            Forensic ingestion console — realtime vault telemetry, investigation drawer, and analyst-grade filters.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void fetch()}
          disabled={loading}
          className="flex items-center gap-2 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-xs font-medium text-slate-200 transition hover:bg-white/[0.07] disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          {lastRefresh ? lastRefresh.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "Sync"}
        </button>
      </div>

      {error ? (
        <div className="flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
        {statsCards.map((s) => (
          <div key={s.label} className={`rounded-xl border p-3 ${s.color}`}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold uppercase tracking-wide opacity-80">{s.label}</span>
              <s.icon className="h-4 w-4 shrink-0 opacity-70" />
            </div>
            <p className="mt-1 text-xl font-bold tabular-nums">{s.value}</p>
            <p className="mt-0.5 text-[9px] uppercase tracking-wider opacity-60">{s.hint}</p>
          </div>
        ))}
      </div>

      {/* Compact analytics row */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-12 lg:items-stretch">
        <div className="min-w-0 rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 shadow-inner shadow-black/40 lg:col-span-7">
          <div className="mb-1 flex items-center justify-between gap-2">
            <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Threat distribution</h3>
            <span className="text-[10px] text-slate-600">{analytics?.syncedAt ? `Δ ${formatDate(analytics.syncedAt)}` : ""}</span>
          </div>
          {threatDist.length ? (
            <div className="h-[128px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={threatDist} margin={{ top: 4, right: 6, left: 4, bottom: 2 }} barCategoryGap="28%">
                  <CartesianGrid strokeDasharray="3 3" stroke="#ffffff08" vertical={false} />
                  <XAxis dataKey="level" tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fill: "#64748B", fontSize: 10 }} axisLine={false} tickLine={false} width={36} />
                  <RechartsTooltip content={<ChartTooltip />} cursor={{ fill: "rgba(34,211,238,0.04)" }} />
                  <Bar dataKey="count" radius={[3, 3, 0, 0]} maxBarSize={18}>
                    {threatDist.map((entry) => (
                      <Cell key={entry.level} fill={entry.color} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="flex h-[128px] items-center justify-center text-xs text-slate-600">No telemetry</div>
          )}
        </div>

        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 shadow-inner shadow-black/40 lg:col-span-5">
          <h3 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400">Scan posture</h3>
          {scanDist.length ? (
            <div className="flex items-center gap-3">
              <div className="relative h-[104px] w-[104px] shrink-0">
              <PieChart width={104} height={104}>
                <Pie
                  data={scanDist}
                  dataKey="count"
                  nameKey="name"
                  cx={52}
                  cy={52}
                  innerRadius={28}
                  outerRadius={42}
                  strokeWidth={0}
                  paddingAngle={2}
                >
                    {scanDist.map((entry) => (
                      <Cell key={entry.name} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip content={<ChartTooltip />} />
                </PieChart>
                <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-[9px] font-semibold uppercase text-slate-500">Total</span>
                  <span className="font-mono text-sm font-bold text-white">{donutTotal}</span>
                </div>
              </div>
              <ul className="min-w-0 flex-1 space-y-1 text-[10px] leading-tight">
                {scanDist.slice(0, 6).map((d) => (
                  <li key={d.name} className="flex items-center gap-2">
                    <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: d.color }} />
                    <span className="truncate text-slate-400">{truncate(d.name, 22)}</span>
                    <span className="ml-auto shrink-0 font-mono text-slate-200">{d.count}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : (
            <div className="flex h-[104px] items-center justify-center text-xs text-slate-600">No scan mix</div>
          )}
        </div>
      </div>

      {/* Investigation table */}
      <div className="overflow-hidden rounded-xl border border-white/[0.07] bg-[#070c14]/90 shadow-[0_0_60px_rgba(0,0,0,0.35)]">
        <div className="flex flex-col gap-2 border-b border-white/10 p-3 md:flex-row md:flex-wrap md:items-center">
          <div className="flex min-w-[200px] flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/30 px-3 py-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-slate-500" />
            <input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search filename, hash, owner…"
              className="flex-1 bg-transparent text-xs text-slate-100 placeholder-slate-600 outline-none"
            />
            {search ? (
              <button type="button" aria-label="Clear search" onClick={() => setSearch("")}>
                <X className="h-3.5 w-3.5 text-slate-500 hover:text-slate-300" />
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-slate-600" />
            <select
              value={threatFilter}
              onChange={(e) => {
                setThreatFilter(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-white/10 bg-[#080f18] px-2 py-1.5 text-[11px] text-slate-300 outline-none"
            >
              <option value="">Threat: any</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="none">None</option>
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => {
                setDateFrom(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-white/10 bg-[#080f18] px-2 py-1.5 text-[11px] text-slate-300"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => {
                setDateTo(e.target.value);
                setPage(1);
              }}
              className="rounded-lg border border-white/10 bg-[#080f18] px-2 py-1.5 text-[11px] text-slate-300"
            />
            <input
              value={ownerEmail}
              onChange={(e) => {
                setOwnerEmail(e.target.value);
                setPage(1);
              }}
              placeholder="Owner email"
              className="min-w-[140px] rounded-lg border border-white/10 bg-[#080f18] px-2 py-1.5 text-[11px] text-slate-300 outline-none placeholder:text-slate-600"
            />
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-black/25 px-2 py-1.5 text-[10px] text-slate-400">
              <input
                type="checkbox"
                checked={encryptedOnly}
                onChange={(e) => {
                  setEncryptedOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-white/20 bg-transparent"
              />
              AES only
            </label>
            <label className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-white/10 bg-black/25 px-2 py-1.5 text-[10px] text-slate-400">
              <input
                type="checkbox"
                checked={suspiciousOnly}
                onChange={(e) => {
                  setSuspiciousOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-white/20 bg-transparent"
              />
              Suspicious
            </label>
            <select
              value={pageSize}
              onChange={(e) => {
                setPageSize(Number(e.target.value));
                setPage(1);
              }}
              className="rounded-lg border border-white/10 bg-[#080f18] px-2 py-1.5 text-[11px] text-slate-300 outline-none"
            >
              {[15, 25, 40, 60].map((n) => (
                <option key={n} value={n}>
                  {n}/page
                </option>
              ))}
            </select>
          </div>

          <span className="text-[11px] text-slate-600">{total} records</span>
        </div>

        {/* Mobile cards */}
        <div className="divide-y divide-white/[0.05] md:hidden">
          {loading && files.length === 0 ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-7 w-7 animate-spin text-slate-600" />
            </div>
          ) : null}
          {!loading && files.length === 0 ? (
            <div className="px-4 py-10 text-center text-sm text-slate-500">No files match filters.</div>
          ) : null}
          {files.map((file) => (
            <button
              key={file.id}
              type="button"
              onClick={() => openDrawer(file, "overview")}
              className="flex w-full flex-col gap-2 px-4 py-3 text-left transition hover:bg-white/[0.03]"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="break-all font-mono text-xs text-slate-100">{truncate(file.name, 42)}</span>
                <span className={`shrink-0 rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${threatBadgeClasses(file.threatLevel)}`}>
                  {file.threatLevel}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
                <span>{formatBytes(file.size)}</span>
                <span>{formatDate(file.uploadDate)}</span>
                <span>{truncate(file.owner?.email, 28)}</span>
              </div>
              <div className="flex gap-2">
                <span className={`rounded px-2 py-0.5 text-[10px] ${scanBadgeClasses(file.malwareScanStatus)}`}>
                  {file.malwareScanStatus || "pending"}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Desktop table */}
        <div ref={scrollRef} className="hidden max-h-[min(520px,58vh)] overflow-auto md:block" onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
          <table className="w-full border-collapse text-left text-[11px]">
            <thead className="sticky top-0 z-20 border-b border-white/10 bg-[#070c14]/95 backdrop-blur-md">
              <tr className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                <th className="whitespace-nowrap px-3 py-2 text-slate-500">Artifact</th>
                <th className="hidden whitespace-nowrap px-3 py-2 md:table-cell">
                  <span className="text-slate-500">Owner</span>
                </th>
                <th className="hidden whitespace-nowrap px-3 py-2 lg:table-cell">
                  <SortHead label="Size" field="size" sort={sort} sortDir={sortDir} onSort={sortColumn} />
                </th>
                <th className="hidden whitespace-nowrap px-3 py-2 xl:table-cell">
                  <SortHead label="Uploaded" field="uploadDate" sort={sort} sortDir={sortDir} onSort={sortColumn} />
                </th>
                <th className="whitespace-nowrap px-3 py-2">
                  <SortHead label="Threat" field="threat" sort={sort} sortDir={sortDir} onSort={sortColumn} />
                </th>
                <th className="hidden whitespace-nowrap px-3 py-2 lg:table-cell">Scan</th>
                <th className="hidden whitespace-nowrap px-3 py-2 xl:table-cell">Vault</th>
                <th className="hidden whitespace-nowrap px-3 py-2 2xl:table-cell">Hash</th>
                <th className="whitespace-nowrap px-2 py-2 text-right">
                  <MoreHorizontal className="ml-auto h-4 w-4 text-slate-600" aria-hidden />
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && files.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center">
                    <Loader2 className="mx-auto h-7 w-7 animate-spin text-slate-600" />
                    <p className="mt-2 text-xs text-slate-600">Loading catalogue…</p>
                  </td>
                </tr>
              ) : null}
              {!loading && files.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-14 text-center text-slate-600">
                    <FileText className="mx-auto h-8 w-8 opacity-40" />
                    <p className="mt-2 text-sm">No artifacts</p>
                  </td>
                </tr>
              ) : null}
              {virtual.padTop > 0 ? (
                <tr aria-hidden="true" style={{ height: virtual.padTop }}>
                  <td colSpan={9} style={{ padding: 0, border: "none" }} />
                </tr>
              ) : null}
              {virtual.slice.map((file) => (
                <UploadRow
                  key={file.id}
                  file={file}
                  selected={drawer.open && drawer.id === file.id}
                  flash={highlightId === file.id}
                  onOpenRow={openDrawer}
                  onQuickDownload={quickDownload}
                  onQuickDelete={quickDelete}
                />
              ))}
              {virtual.padBottom > 0 ? (
                <tr aria-hidden="true" style={{ height: virtual.padBottom }}>
                  <td colSpan={9} style={{ padding: 0, border: "none" }} />
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {totalPages > 1 ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-white/10 px-4 py-2.5">
            <span className="text-[11px] text-slate-600">
              Page {page} / {totalPages} · {total} rows
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/[0.05] disabled:opacity-35"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/10 text-slate-400 transition hover:bg-white/[0.05] disabled:opacity-35"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <Suspense
        fallback={
          drawer.open ? (
            <div className="fixed bottom-6 right-6 z-[72] rounded-xl border border-white/10 bg-black/80 px-4 py-3 text-xs text-slate-400 shadow-xl">
              Opening investigator…
            </div>
          ) : null
        }
      >
        <UploadForensicDrawer
          open={drawer.open}
          fileId={drawer.id}
          initialTab={drawer.tab}
          listRowSnapshot={drawer.snapshot}
          onClose={closeDrawer}
          onMutated={() => void fetchSilent()}
        />
      </Suspense>
    </div>
  );
}
