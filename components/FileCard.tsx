import React, { useState } from 'react';
import { FileItem, ProcessStatus } from '../types';
import { DeleteIcon, DownloadIcon, ImageIcon, RetryIcon, EyeIcon, ChevronUpIcon, ChevronDownIcon } from './Icons';
import { ResultPreview } from './ResultPreview';

interface FileCardProps {
  item: FileItem;
  onDelete: (id: string) => void;
  onRetry: (id: string) => void;
  onSelect: (id: string) => void;
  onDownload: (id: string) => void;
}

export const FileCard: React.FC<FileCardProps> = ({ item, onDelete, onRetry, onSelect, onDownload }) => {
  const [expanded, setExpanded] = useState(false);
  
  const getStatusColor = () => {
    switch (item.status) {
      case ProcessStatus.SUCCESS: return 'border-cyber-success/50 shadow-[0_0_10px_rgba(16,185,129,0.1)]';
      case ProcessStatus.ERROR: return 'border-cyber-danger/50 shadow-[0_0_10px_rgba(239,68,68,0.1)]';
      case ProcessStatus.PROCESSING: return 'border-cyber-primary/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]';
      default: return 'border-white/10 hover:border-white/30';
    }
  };

  return (
    <div className={`transition-all duration-300 animate-fade-in`}>
      <div className={`relative flex items-center p-4 rounded-xl bg-cyber-slate/60 backdrop-blur-md border ${getStatusColor()} ${expanded ? 'rounded-b-none border-b-0' : ''}`}>
        
        {/* Selection Checkbox */}
        <div className="pl-4">
          <label className="cursor-pointer group">
             <div className={`w-5 h-5 rounded border flex items-center justify-center transition-all ${item.selected ? 'bg-cyber-primary border-cyber-primary' : 'border-gray-600 group-hover:border-cyber-primary'}`}>
                {item.selected && <div className="w-2.5 h-2.5 bg-black rounded-[1px]"></div>}
             </div>
             <input 
                type="checkbox" 
                checked={item.selected} 
                onChange={() => onSelect(item.id)}
                className="hidden"
            />
          </label>
        </div>

        {/* Thumbnail */}
        <div className="w-16 h-16 rounded overflow-hidden border border-white/10 flex-shrink-0 bg-black/50 flex items-center justify-center relative group">
          {item.previewUrl ? (
            <>
                <img src={item.previewUrl} alt="preview" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                <div className="absolute inset-0 bg-cyber-primary/10 mix-blend-overlay"></div>
            </>
          ) : (
            <ImageIcon className="w-8 h-8 text-gray-600" />
          )}
        </div>

        {/* Info & Progress */}
        <div className="flex-1 px-5 min-w-0">
          <div className="flex justify-between items-start">
              <h4 className="text-sm font-bold text-gray-200 truncate font-mono tracking-wide" title={item.file.name}>
                {item.file.name}
              </h4>
               {/* Status Badge */}
               <div className="flex items-center gap-1">
                  {item.status === ProcessStatus.SUCCESS && <span className="text-[10px] font-bold text-green-400 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded uppercase tracking-wider shadow-[0_0_8px_rgba(16,185,129,0.3)]">تکمیل</span>}
                  {item.status === ProcessStatus.ERROR && <span className="text-[10px] font-bold text-red-400 bg-red-500/10 border border-red-500/30 px-2 py-0.5 rounded uppercase tracking-wider shadow-[0_0_8px_rgba(239,68,68,0.3)]">خطا</span>}
                  {item.status === ProcessStatus.PROCESSING && <span className="text-[10px] font-bold text-cyber-primary bg-cyber-primary/10 border border-cyber-primary/30 px-2 py-0.5 rounded uppercase tracking-wider shadow-[0_0_8px_rgba(6,182,212,0.3)] animate-pulse">در حال پردازش</span>}
                  {item.status === ProcessStatus.QUEUED && <span className="text-[10px] font-bold text-gray-400 bg-white/5 border border-white/10 px-2 py-0.5 rounded uppercase tracking-wider">در صف</span>}
               </div>
          </div>

          {/* Dynamic Status Text */}
          <div className="flex justify-between items-end mt-2">
            <p className="text-xs text-gray-400 truncate">
                {item.status === ProcessStatus.IDLE && "آماده برای اسکن..."}
                {item.status === ProcessStatus.PROCESSING && <span className="text-cyber-primary">شبکه عصبی در حال تحلیل...</span>}
                {item.status === ProcessStatus.SUCCESS && <span className="text-gray-300">{item.result?.title || "داده‌ها با موفقیت استخراج شدند"}</span>}
                {item.status === ProcessStatus.ERROR && <span className="text-red-400">{item.error}</span>}
            </p>
            
            {/* Confidence Display */}
            {item.status === ProcessStatus.SUCCESS && item.result && (
                <div className="flex items-center gap-2" title="میانگین دقت">
                    <span className="text-[10px] text-gray-500 uppercase">دقت</span>
                    <div className="h-1.5 w-16 bg-gray-700 rounded-full overflow-hidden">
                        <div className="h-full bg-cyber-primary shadow-[0_0_5px_rgba(6,182,212,0.8)]" style={{width: '94%'}}></div>
                    </div>
                    <span className="text-[10px] text-cyber-primary font-mono">94%</span>
                </div>
            )}
          </div>

          {/* Progress Bar (Cyberpunk Style) */}
          {(item.status === ProcessStatus.PROCESSING || item.status === ProcessStatus.QUEUED) && (
             <div className="relative w-full bg-black/50 rounded-full h-1 mt-2 overflow-hidden border border-white/5">
              <div 
                className="absolute top-0 bottom-0 bg-cyber-primary shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all duration-300" 
                style={{ width: `${item.progress}%` }}
              >
                  <div className="absolute right-0 top-0 bottom-0 w-2 bg-white blur-[2px]"></div>
              </div>
            </div>
          )}
        </div>

        {/* Actions - Changed border-l to border-r for RTL */}
        <div className="flex items-center gap-2 border-r border-white/10 pr-4">
          {item.status === ProcessStatus.SUCCESS && (
            <>
              <button 
                onClick={() => setExpanded(!expanded)}
                className={`p-2 rounded transition-all duration-300 group
                    ${expanded ? 'bg-cyber-primary text-black' : 'text-gray-400 hover:text-cyber-primary hover:bg-white/5'}
                `}
                title="مشاهده داده‌ها"
              >
                {expanded ? <ChevronUpIcon className="w-4 h-4" /> : <EyeIcon className="w-4 h-4" />}
              </button>
            
              <button 
                onClick={() => onDownload(item.id)}
                className="p-2 text-cyber-primary hover:bg-cyber-primary/20 rounded transition-colors"
                title="دانلود فایل Word"
              >
                <DownloadIcon className="w-4 h-4" />
              </button>
            </>
          )}
          
          {item.status === ProcessStatus.ERROR && (
            <button 
              onClick={() => onRetry(item.id)}
              className="p-2 text-orange-400 hover:bg-orange-500/10 rounded transition-colors"
              title="تلاش مجدد"
            >
              <RetryIcon className="w-4 h-4" />
            </button>
          )}

          <button 
            onClick={() => onDelete(item.id)}
            className="p-2 text-gray-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
            title="حذف"
          >
            <DeleteIcon className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Expanded Result Preview */}
      {expanded && item.result && (
        <div className="border-x border-b border-cyber-primary/20 rounded-b-xl p-1 bg-cyber-black/40 backdrop-blur-sm relative overflow-hidden">
           {/* Top inner shadow for depth */}
           <div className="absolute top-0 left-0 right-0 h-4 bg-gradient-to-b from-black/20 to-transparent pointer-events-none"></div>
           <ResultPreview result={item.result} />
        </div>
      )}
    </div>
  );
};