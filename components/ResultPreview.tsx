import React, { useEffect, useRef } from 'react';
import { AIAnalysisResult } from '../types';
import { MathRenderer } from './MathRenderer';

interface ResultPreviewProps {
  result: AIAnalysisResult;
}

export const ResultPreview: React.FC<ResultPreviewProps> = ({ result }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Force global typesetting for inline math found in text segments
    if (window.MathJax && window.MathJax.typesetPromise && containerRef.current) {
      window.MathJax.typesetPromise([containerRef.current]).catch(err => console.log(err));
    }
  }, [result]);

  return (
    <div className="p-6" ref={containerRef}>
      
      {/* Header */}
      <div className="mb-6 flex justify-between items-end border-b border-white/10 pb-4">
         <div>
            <span className="text-[10px] text-cyber-primary uppercase tracking-widest font-mono mb-1 block">عنوان سند</span>
            <h3 className="text-xl font-bold text-white">{result.title}</h3>
         </div>
         <span className="text-[10px] border border-cyber-primary/30 text-cyber-primary px-2 py-1 rounded bg-cyber-primary/5 uppercase tracking-widest">
            زبان: {result.language === 'Persian' ? 'فارسی' : result.language}
         </span>
      </div>

      {/* Content Stream */}
      <div className="space-y-6">
        {result.segments.map((segment, index) => {
          
          if (segment.type === 'formula') {
             return (
               <div key={index} className="my-4">
                  {/* Clean formula display */}
                  <div className="bg-black/20 rounded-lg p-4 overflow-x-auto flex justify-center border border-white/5">
                      <MathRenderer latex={segment.content} />
                  </div>
               </div>
             );
          }
          
          if (segment.type === 'chart_description') {
             return (
               <div key={index} className="bg-gradient-to-l from-cyber-primary/10 to-transparent border-l-2 border-cyber-primary p-4 rounded-r-lg my-2">
                  <div className="flex items-center gap-2 mb-2">
                     <div className="w-1.5 h-1.5 bg-cyber-primary rounded-full animate-pulse"></div>
                     <span className="font-bold text-cyber-glow text-xs uppercase tracking-wider font-mono">تحلیل آماری نمودار</span>
                  </div>
                  <p className="text-sm text-gray-200 leading-relaxed text-justify border-t border-cyber-primary/10 pt-2 font-light">
                    {segment.content}
                  </p>
               </div>
             );
          }
          
          // Plain Text (including inline math)
          // We use dangerouslySetInnerHTML to allow <br> tags.
          // MathJax will automatically scan this div because of the useEffect above.
          return (
            <div key={index} className="relative pr-2">
                <div className="leading-relaxed text-justify text-base text-gray-300 pr-4 font-light">
                   <span dangerouslySetInnerHTML={{__html: segment.content.replace(/\n/g, '<br/>')}} />
                </div>
            </div>
          );
        })}
      </div>
      
      {/* Footer */}
      <div className="mt-8 pt-4 border-t border-white/5 text-center">
         <p className="text-[10px] text-gray-600 font-mono uppercase">پایان پردازش داده‌ها</p>
      </div>
    </div>
  );
};