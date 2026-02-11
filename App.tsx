import React, { useState, useRef, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { UploadIcon, FileIcon, SpinnerIcon, CheckIcon } from './components/Icons';
import { FileCard } from './components/FileCard';
import { FileItem, ProcessStatus } from './types';
import { analyzeImage } from './services/geminiService';
import { generateDocx } from './services/docxService';

// Main Application
const App = () => {
  const [files, setFiles] = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // --- File Handling ---

  const handleFiles = (newFiles: FileList | null) => {
    if (!newFiles) return;
    
    const newItems: FileItem[] = Array.from(newFiles).map(file => ({
      id: Math.random().toString(36).substring(7),
      file,
      previewUrl: URL.createObjectURL(file),
      status: ProcessStatus.IDLE,
      progress: 0,
      selected: true,
    }));

    setFiles(prev => [...prev, ...newItems]);
  };

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  // --- Logic ---

  const handleDelete = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const handleSelect = (id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, selected: !f.selected } : f));
  };

  const toggleSelectAll = () => {
    const allSelected = files.every(f => f.selected);
    setFiles(prev => prev.map(f => ({ ...f, selected: !allSelected })));
  };

  const processFile = async (id: string) => {
    setFiles(prev => prev.map(f => f.id === id ? { ...f, status: ProcessStatus.PROCESSING, progress: 1 } : f));

    // Get current file
    const fileItem = files.find(f => f.id === id);
    if (!fileItem) return;

    // Minimum processing time in ms (40 seconds)
    const MIN_PROCESS_TIME = 40000;
    const startTime = Date.now();

    // Progress Interval: updates progress bar smoothly over ~40s
    // We target 90% by 40s. 90 / 400 (intervals of 100ms) = 0.225 increment per 100ms
    const progressInterval = setInterval(() => {
      setFiles(prev => prev.map(f => {
          if (f.id === id && f.status === ProcessStatus.PROCESSING) {
              const elapsed = Date.now() - startTime;
              // Calculate progress percentage based on time (capped at 95% until done)
              let newProgress = Math.min(95, (elapsed / MIN_PROCESS_TIME) * 100);
              return { ...f, progress: newProgress };
          }
          return f;
      }));
    }, 100);

    try {
      // Run AI and Minimum Delay in parallel
      const [result] = await Promise.all([
        analyzeImage(fileItem.file),
        new Promise(resolve => setTimeout(resolve, MIN_PROCESS_TIME))
      ]);
      
      clearInterval(progressInterval);

      setFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        status: ProcessStatus.SUCCESS, 
        progress: 100, 
        result 
      } : f));

    } catch (error) {
      console.error(error);
      clearInterval(progressInterval);
      setFiles(prev => prev.map(f => f.id === id ? { 
        ...f, 
        status: ProcessStatus.ERROR, 
        progress: 0, 
        error: "خطا در پردازش تصویر" 
      } : f));
    }
  };

  const handleProcessSelected = async () => {
    const selectedIds = files.filter(f => f.selected && f.status !== ProcessStatus.SUCCESS).map(f => f.id);
    if (selectedIds.length === 0) return;

    setIsGlobalProcessing(true);
    // Execute sequentially to respect rate limits if needed, or parallel if preferred. 
    // Given the 40s wait, parallel is better for UX, but rate limits might apply.
    // For now, let's do parallel.
    await Promise.all(selectedIds.map(id => processFile(id)));
    setIsGlobalProcessing(false);
  };

  const handleDownload = (id: string) => {
    const item = files.find(f => f.id === id);
    if (item && item.result) {
      generateDocx(item);
    }
  };

  const handleDownloadAllSelected = () => {
     files.forEach(f => {
        if (f.selected && f.status === ProcessStatus.SUCCESS) {
            generateDocx(f);
        }
     });
  };

  // --- Render ---

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden bg-grid" dir="rtl">
      
      {/* Decorative Glow Orbs */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-cyber-primary opacity-10 blur-[128px] pointer-events-none"></div>
      <div className="absolute bottom-0 right-0 w-96 h-96 bg-cyber-accent opacity-10 blur-[128px] pointer-events-none"></div>

      {/* Header (HUD Style) */}
      <header className="border-b border-cyber-primary/20 bg-cyber-black/80 backdrop-blur-md sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyber-primary to-cyber-accent rounded-lg blur opacity-40 group-hover:opacity-100 transition duration-200"></div>
                <div className="relative bg-cyber-black border border-cyber-primary/50 text-cyber-primary p-2 rounded-lg">
                   <FileIcon className="w-6 h-6" />
                </div>
             </div>
             <div>
                <h1 className="text-2xl font-bold text-white tracking-tight drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                    هسته پردازش <span className="text-cyber-primary">OCR</span>
                </h1>
                <p className="text-[10px] text-cyber-primary/60 uppercase tracking-widest hidden sm:block">سامانه تحلیلگر دقیق اسناد فارسی</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4">
              <div className="text-left hidden sm:block">
                  <span className="block text-[9px] text-cyber-primary/50 uppercase tracking-widest">مدل سیستم</span>
                  <div className="flex items-center gap-1.5 flex-row-reverse">
                    <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                    <span className="text-xs font-mono font-bold text-gray-300">GEMINI-3-PRO: THINKING ON</span>
                  </div>
              </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 z-10">
        
        {/* Upload Portal */}
        <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            className={`
                relative group cursor-pointer rounded-xl transition-all duration-300
                flex flex-col items-center justify-center py-16 px-4 mb-10 text-center overflow-hidden
                border border-dashed 
                ${isDragging 
                    ? 'border-cyber-primary bg-cyber-primary/10 scale-[1.02] shadow-[0_0_30px_rgba(6,182,212,0.2)]' 
                    : 'border-white/10 hover:border-cyber-primary/50 hover:bg-white/5 bg-cyber-slate/30 backdrop-blur-sm'
                }
            `}
        >
            {/* Animated Scanline Background */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity bg-[linear-gradient(0deg,transparent_40%,rgba(6,182,212,0.5)_50%,transparent_60%)] bg-[length:100%_4px]"></div>
            
            <input 
                ref={fileInputRef} 
                type="file" 
                multiple 
                accept="image/*" 
                className="hidden" 
                onChange={(e) => handleFiles(e.target.files)}
            />
            
            <div className={`p-5 rounded-full bg-cyber-black border border-white/10 mb-6 group-hover:border-cyber-primary group-hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all duration-300`}>
                <UploadIcon className="w-10 h-10 text-gray-400 group-hover:text-cyber-primary transition-colors" />
            </div>
            <h3 className="text-xl font-bold text-gray-200 mb-2 tracking-wide">بارگذاری داده‌های ورودی</h3>
            <p className="text-sm text-gray-400 font-mono">تصاویر را اینجا رها کنید یا برای انتخاب فایل کلیک کنید</p>
            
            <div className="mt-6 flex gap-4 text-[10px] uppercase tracking-widest text-cyber-primary/70">
                <span className="border border-cyber-primary/20 px-2 py-1 rounded">متن دقیق</span>
                <span className="border border-cyber-primary/20 px-2 py-1 rounded">لاتکس (LaTeX)</span>
                <span className="border border-cyber-primary/20 px-2 py-1 rounded">تحلیل نمودار</span>
            </div>
        </div>

        {/* Action Command Bar */}
        {files.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center mb-6 gap-4 bg-cyber-slate/80 border border-white/10 backdrop-blur-md p-4 rounded-lg shadow-glass">
                <div className="flex items-center gap-3">
                    <label className="flex items-center cursor-pointer gap-3 group">
                        <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${files.every(f => f.selected) ? 'bg-cyber-primary border-cyber-primary' : 'border-gray-500 group-hover:border-cyber-primary'}`}>
                             {files.every(f => f.selected) && <CheckIcon className="w-3.5 h-3.5 text-black" />}
                             <input 
                                type="checkbox" 
                                onChange={toggleSelectAll}
                                checked={files.length > 0 && files.every(f => f.selected)}
                                className="hidden"
                            />
                        </div>
                        <span className="text-sm font-medium text-gray-300 group-hover:text-cyber-primary transition-colors">انتخاب همه ({files.length})</span>
                    </label>
                </div>

                <div className="flex gap-3 w-full sm:w-auto">
                    <button 
                        onClick={handleProcessSelected}
                        disabled={isGlobalProcessing || !files.some(f => f.selected && f.status !== ProcessStatus.SUCCESS)}
                        className={`
                            flex-1 sm:flex-none flex items-center justify-center gap-2 px-8 py-2.5 rounded font-bold text-sm tracking-wide transition-all
                            ${isGlobalProcessing || !files.some(f => f.selected && f.status !== ProcessStatus.SUCCESS) 
                                ? 'bg-white/5 text-gray-500 border border-white/5 cursor-not-allowed' 
                                : 'bg-cyber-primary/10 text-cyber-primary border border-cyber-primary hover:bg-cyber-primary hover:text-black hover:shadow-[0_0_20px_rgba(6,182,212,0.6)]'}
                        `}
                    >
                        {isGlobalProcessing ? <SpinnerIcon className="w-4 h-4" /> : <div className="w-2 h-2 bg-current rounded-full animate-pulse" />}
                        <span>اجرای تحلیل عمیق (۴۰ ثانیه)</span>
                    </button>

                    <button 
                         onClick={handleDownloadAllSelected}
                         disabled={!files.some(f => f.selected && f.status === ProcessStatus.SUCCESS)}
                         className={`
                            flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 rounded font-bold text-sm tracking-wide transition-all border
                            ${!files.some(f => f.selected && f.status === ProcessStatus.SUCCESS)
                                ? 'border-white/5 text-gray-600 cursor-not-allowed'
                                : 'border-white/20 text-gray-300 hover:border-cyber-accent hover:text-cyber-accent hover:bg-cyber-accent/10'}
                        `}
                    >
                         <UploadIcon className="w-4 h-4 rotate-180" />
                         <span>دریافت خروجی Word</span>
                    </button>
                </div>
            </div>
        )}

        {/* Data Grid */}
        <div className="space-y-4">
            {files.map(file => (
                <FileCard 
                    key={file.id} 
                    item={file} 
                    onDelete={handleDelete}
                    onRetry={processFile}
                    onSelect={handleSelect}
                    onDownload={handleDownload}
                />
            ))}
        </div>

        {/* Empty State */}
        {files.length === 0 && (
             <div className="text-center mt-20 opacity-30">
                 <p className="text-xs font-mono text-cyber-primary uppercase tracking-[0.2em]">سیستم در حالت آماده‌باش</p>
             </div>
        )}

      </main>
    </div>
  );
};

export default App;