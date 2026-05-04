import { useState, useCallback, useRef, useEffect } from 'react';
import { 
  Upload, 
  Shield, 
  Lock, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  File,
  Image as ImageIcon,
  FileText,
  Video,
  Music,
  Archive,
  X,
  Clock,
  Database
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Card } from './Card';
import { Button } from './Button';
import { Badge } from './Badge';
import { ProgressBar } from './ProgressBar';
import { cn } from '../shadcn/utils';

type UploadState = 'idle' | 'dragover' | 'uploading' | 'processing' | 'done' | 'error';
type RiskLevel = 'safe' | 'suspicious' | 'dangerous';

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: string;
  uploadProgress: number;
  processingProgress: number;
  state: UploadState;
  riskLevel?: RiskLevel;
  uploadedAt?: Date;
  encrypted?: boolean;
}

interface HistoryFile {
  id: string;
  name: string;
  size: number;
  type: string;
  riskLevel: RiskLevel;
  uploadedAt: Date;
  encrypted: boolean;
}

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
  if (type.startsWith('video/')) return <Video className="w-5 h-5" />;
  if (type.startsWith('audio/')) return <Music className="w-5 h-5" />;
  if (type.includes('zip') || type.includes('rar')) return <Archive className="w-5 h-5" />;
  if (type.includes('text') || type.includes('document')) return <FileText className="w-5 h-5" />;
  return <File className="w-5 h-5" />;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function getRiskColor(risk: RiskLevel): string {
  switch (risk) {
    case 'safe': return '#10B981';
    case 'suspicious': return '#F59E0B';
    case 'dangerous': return '#EF4444';
  }
}

function getRiskVariant(risk: RiskLevel): 'secure' | 'warning' | 'danger' {
  switch (risk) {
    case 'safe': return 'secure';
    case 'suspicious': return 'warning';
    case 'dangerous': return 'danger';
  }
}

export function FileUpload() {
  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadSuccessMessage, setUploadSuccessMessage] = useState<string | null>(null);
  const [currentFiles, setCurrentFiles] = useState<UploadedFile[]>([]);
  const [history, setHistory] = useState<HistoryFile[]>([
    {
      id: '1',
      name: 'financial_report_2026.pdf',
      size: 2458624,
      type: 'application/pdf',
      riskLevel: 'safe',
      uploadedAt: new Date(Date.now() - 3600000),
      encrypted: true,
    },
    {
      id: '2',
      name: 'database_backup.sql',
      size: 15728640,
      type: 'application/sql',
      riskLevel: 'safe',
      uploadedAt: new Date(Date.now() - 7200000),
      encrypted: true,
    },
    {
      id: '3',
      name: 'suspicious_script.exe',
      size: 524288,
      type: 'application/x-msdownload',
      riskLevel: 'dangerous',
      uploadedAt: new Date(Date.now() - 10800000),
      encrypted: false,
    },
  ]);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const timeoutsRef = useRef<number[]>([]);
  const uploadIntervalsRef = useRef<number[]>([]);
  const processingIntervalsRef = useRef<number[]>([]);

  const clearAllTimers = useCallback(() => {
    uploadIntervalsRef.current.forEach(id => window.clearInterval(id));
    processingIntervalsRef.current.forEach(id => window.clearInterval(id));
    timeoutsRef.current.forEach(id => window.clearTimeout(id));
    uploadIntervalsRef.current = [];
    processingIntervalsRef.current = [];
    timeoutsRef.current = [];
  }, []);

  useEffect(() => {
    return () => clearAllTimers();
  }, [clearAllTimers]);

  const simulateUpload = useCallback((file: UploadedFile) => {
    let progress = 0;
    const uploadInterval = window.setInterval(() => {
      progress += 10;
      setCurrentFiles(prev => 
        prev.map(f => f.id === file.id ? { ...f, uploadProgress: progress } : f)
      );
      
      if (progress >= 100) {
        window.clearInterval(uploadInterval);
        uploadIntervalsRef.current = uploadIntervalsRef.current.filter(id => id !== uploadInterval);
        setCurrentFiles(prev => 
          prev.map(f => f.id === file.id ? { ...f, state: 'processing' } : f)
        );
        simulateProcessing(file);
      }
    }, 200);
    uploadIntervalsRef.current.push(uploadInterval);
  }, []);

  const simulateProcessing = useCallback((file: UploadedFile) => {
    let progress = 0;
    const processingInterval = window.setInterval(() => {
      progress += 8;
      setCurrentFiles(prev => 
        prev.map(f => f.id === file.id ? { ...f, processingProgress: progress } : f)
      );
      
      if (progress >= 100) {
        window.clearInterval(processingInterval);
        processingIntervalsRef.current = processingIntervalsRef.current.filter(id => id !== processingInterval);
        
        // Simulate risk assessment
        const riskLevels: RiskLevel[] = ['safe', 'safe', 'safe', 'suspicious', 'dangerous'];
        const randomRisk = riskLevels[Math.floor(Math.random() * riskLevels.length)];
        
        setCurrentFiles(prev => 
          prev.map(f => f.id === file.id 
            ? { 
                ...f, 
                state: 'done', 
                riskLevel: randomRisk,
                uploadedAt: new Date(),
                encrypted: true 
              } 
            : f
          )
        );

        // Add to history after 2 seconds
        const historyTimeout = window.setTimeout(() => {
          setUploadSuccessMessage(`${file.name} uploaded successfully.`);
          setHistory(prev => [{
            id: file.id,
            name: file.name,
            size: file.size,
            type: file.type,
            riskLevel: randomRisk,
            uploadedAt: new Date(),
            encrypted: true,
          }, ...prev]);
          
          // Remove from current files
          const cleanupTimeout = window.setTimeout(() => {
            setCurrentFiles(prev => {
              const nextFiles = prev.filter(f => f.id !== file.id);
              if (nextFiles.length === 0) {
                setUploadState('idle');
              }
              return nextFiles;
            });
            if (fileInputRef.current) {
              fileInputRef.current.value = '';
            }
            setSelectedFile(null);
          }, 3000);
          timeoutsRef.current.push(cleanupTimeout);
        }, 2000);
        timeoutsRef.current.push(historyTimeout);
      }
    }, 250);
    processingIntervalsRef.current.push(processingInterval);
  }, []);

  const handleFiles = useCallback((files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploadSuccessMessage(null);
    setSelectedFile(files[0] ?? null);

    const newFiles: UploadedFile[] = Array.from(files).map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      uploadProgress: 0,
      processingProgress: 0,
      state: 'uploading' as UploadState,
    }));

    setCurrentFiles(prev => [...prev, ...newFiles]);
    setUploadState('uploading');
    
    newFiles.forEach(file => simulateUpload(file));
  }, [simulateUpload]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState('dragover');
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (currentFiles.length === 0) {
      setUploadState('idle');
    }
  }, [currentFiles.length]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setUploadState('idle');
    handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

  const handleFileInput = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    // Reset native input so selecting the same file still triggers onChange.
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setSelectedFile(null);
  }, [handleFiles]);

  const removeFile = useCallback((id: string) => {
    setCurrentFiles(prev => prev.filter(f => f.id !== id));
  }, []);

  const removeHistoryItem = useCallback((id: string) => {
    setHistory(prev => prev.filter(f => f.id !== id));
  }, []);

  return (
    <div className="min-h-screen bg-[#0B0F1A] p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-3 bg-[#3B82F6]/10 rounded-xl">
              <Upload className="w-6 h-6 text-[#3B82F6]" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-[#E5E7EB]">File Upload Center</h1>
              <p className="text-[#9CA3AF]">Secure cloud storage with automatic threat detection</p>
            </div>
          </div>
        </div>

        {/* Upload Area */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card glass className="mb-8">
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={cn(
                'relative p-12 border-2 border-dashed rounded-2xl transition-all duration-300',
                uploadState === 'dragover' 
                  ? 'border-[#3B82F6] bg-[#3B82F6]/5' 
                  : 'border-white/10 hover:border-[#3B82F6]/50'
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileInput}
                className="hidden"
              />
              
              <div className="text-center">
                <motion.div
                  key="upload-box"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="space-y-4"
                >
                  <motion.div
                    animate={{ 
                      y: uploadState === 'dragover' ? -10 : 0,
                      scale: uploadState === 'dragover' ? 1.1 : 1 
                    }}
                    className={cn(
                      'inline-flex p-6 rounded-full mb-4 transition-colors',
                      uploadState === 'dragover' 
                        ? 'bg-[#3B82F6]/20' 
                        : 'bg-[#3B82F6]/10'
                    )}
                  >
                    <Upload className="w-12 h-12 text-[#3B82F6]" />
                  </motion.div>
                  
                  <div>
                    <h3 className="text-xl font-semibold text-[#E5E7EB] mb-2">
                      {uploadState === 'dragover' 
                        ? 'Drop files here to upload' 
                        : 'Drag & drop files here'}
                    </h3>
                    <p className="text-[#9CA3AF] mb-4">
                      Files will be automatically encrypted and scanned for threats
                    </p>

                    <div className="flex flex-wrap items-center justify-center gap-3">
                      <Button 
                        variant="primary" 
                        size="lg"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Choose Files
                      </Button>
                      <Button
                        variant="secondary"
                        size="lg"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        Upload Another File
                      </Button>
                    </div>
                  </div>

                  <AnimatePresence>
                    {uploadSuccessMessage && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 8 }}
                        className="mx-auto max-w-xl rounded-xl border border-[#10B981]/30 bg-[#10B981]/10 px-4 py-3 text-sm text-[#10B981]"
                      >
                        {uploadSuccessMessage}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {selectedFile && (
                    <p className="text-xs text-[#9CA3AF]">
                      Selected: <span className="text-[#E5E7EB]">{selectedFile.name}</span>
                    </p>
                  )}
                  
                  <div className="flex items-center justify-center gap-4 pt-4 text-xs text-[#9CA3AF]">
                    <div className="flex items-center gap-2">
                      <Shield className="w-4 h-4 text-[#10B981]" />
                      <span>Automatic encryption</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-[#10B981]" />
                      <span>Threat scanning</span>
                    </div>
                  </div>
                </motion.div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Current Uploads */}
        <AnimatePresence>
          {currentFiles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-8"
            >
              <h2 className="text-xl font-semibold text-[#E5E7EB] mb-4">
                Current Uploads
              </h2>
              <div className="space-y-4">
                {currentFiles.map(file => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    layout
                  >
                    <Card glass>
                      <div className="flex items-start gap-4">
                        {/* File Icon */}
                        <div className="rounded-xl transition-colors">
                          <div
                            className={cn(
                              'rounded-xl p-3',
                              file.state === 'done' && file.riskLevel ? '' : 'bg-[#3B82F6]/10'
                            )}
                            style={
                              file.state === 'done' && file.riskLevel
                                ? { backgroundColor: `${getRiskColor(file.riskLevel)}20` }
                                : undefined
                            }
                          >
                          {file.state === 'done' && file.riskLevel ? (
                            file.riskLevel === 'safe' ? (
                              <CheckCircle2 
                                className="w-6 h-6" 
                                style={{ color: getRiskColor(file.riskLevel) }}
                              />
                            ) : file.riskLevel === 'suspicious' ? (
                              <AlertTriangle 
                                className="w-6 h-6" 
                                style={{ color: getRiskColor(file.riskLevel) }}
                              />
                            ) : (
                              <XCircle 
                                className="w-6 h-6" 
                                style={{ color: getRiskColor(file.riskLevel) }}
                              />
                            )
                          ) : (
                            <div className="text-[#3B82F6]">
                              {getFileIcon(file.type)}
                            </div>
                          )}
                          </div>
                        </div>

                        {/* File Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1 min-w-0">
                              <h3 className="text-sm font-medium text-[#E5E7EB] truncate">
                                {file.name}
                              </h3>
                              <p className="text-xs text-[#9CA3AF]">
                                {formatFileSize(file.size)}
                              </p>
                            </div>
                            
                            <div className="flex items-center gap-2 ml-4">
                              {file.encrypted && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  className="p-1.5 bg-[#10B981]/10 rounded-lg"
                                >
                                  <Lock className="w-4 h-4 text-[#10B981]" />
                                </motion.div>
                              )}
                              
                              {file.state === 'done' && file.riskLevel && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                >
                                  <Badge variant={getRiskVariant(file.riskLevel)}>
                                    {file.riskLevel.toUpperCase()}
                                  </Badge>
                                </motion.div>
                              )}
                              
                              {file.state !== 'done' && (
                                <button
                                  onClick={() => removeFile(file.id)}
                                  className="p-1 text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Progress */}
                          {file.state === 'uploading' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-[#9CA3AF]">Uploading...</span>
                                <span className="text-[#3B82F6] font-medium">
                                  {file.uploadProgress}%
                                </span>
                              </div>
                              <ProgressBar 
                                value={file.uploadProgress} 
                                variant="primary" 
                              />
                            </div>
                          )}

                          {file.state === 'processing' && (
                            <div className="space-y-2">
                              <div className="flex items-center justify-between text-xs">
                                <div className="flex items-center gap-2">
                                  <Shield className="w-3 h-3 text-[#3B82F6] animate-pulse" />
                                  <span className="text-[#9CA3AF]">
                                    Encrypting and scanning for threats...
                                  </span>
                                </div>
                                <span className="text-[#3B82F6] font-medium">
                                  {file.processingProgress}%
                                </span>
                              </div>
                              <ProgressBar 
                                value={file.processingProgress} 
                                variant="primary" 
                              />
                            </div>
                          )}

                          {file.state === 'done' && (
                            <motion.div
                              initial={{ opacity: 0 }}
                              animate={{ opacity: 1 }}
                              className="flex items-center gap-2 text-xs text-[#10B981]"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Upload complete and secured</span>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Upload History */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-[#E5E7EB]">Upload History</h2>
            <Badge variant="secure">
              <Database className="w-3 h-3 mr-1" />
              {history.length} files
            </Badge>
          </div>

          <Card glass>
            <div className="divide-y divide-white/5">
              {history.length === 0 ? (
                <div className="py-12 text-center">
                  <div className="inline-flex p-4 bg-white/5 rounded-full mb-3">
                    <Clock className="w-8 h-8 text-[#9CA3AF]" />
                  </div>
                  <p className="text-[#9CA3AF]">No upload history yet</p>
                </div>
              ) : (
                history.map((file, index) => (
                  <motion.div
                    key={file.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-center gap-4">
                      {/* File Icon */}
                      <div 
                        className="p-2.5 rounded-lg"
                        style={{ 
                          backgroundColor: `${getRiskColor(file.riskLevel)}20` 
                        }}
                      >
                        <div style={{ color: getRiskColor(file.riskLevel) }}>
                          {getFileIcon(file.type)}
                        </div>
                      </div>

                      {/* File Info */}
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-[#E5E7EB] truncate">
                          {file.name}
                        </h4>
                        <div className="flex items-center gap-3 text-xs text-[#9CA3AF] mt-1">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{file.uploadedAt.toLocaleTimeString()}</span>
                        </div>
                      </div>

                      {/* Status Badges */}
                      <div className="flex items-center gap-2">
                        {file.encrypted && (
                          <div className="p-1.5 bg-[#10B981]/10 rounded-lg">
                            <Lock className="w-4 h-4 text-[#10B981]" />
                          </div>
                        )}
                        
                        <Badge variant={getRiskVariant(file.riskLevel)}>
                          {file.riskLevel.toUpperCase()}
                        </Badge>

                        <button
                          onClick={() => removeHistoryItem(file.id)}
                          className="opacity-0 group-hover:opacity-100 p-1 text-[#9CA3AF] hover:text-[#EF4444] transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
