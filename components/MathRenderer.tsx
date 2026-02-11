import React, { useEffect, useRef } from 'react';

declare global {
  interface Window {
    MathJax: any;
  }
}

interface MathRendererProps {
  latex: string;
}

export const MathRenderer: React.FC<MathRendererProps> = ({ latex }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Debounce rendering slightly to allow DOM to settle
    const timer = setTimeout(() => {
        if (window.MathJax && window.MathJax.typesetPromise && containerRef.current) {
            // Clean content to avoid double delimiters if the AI added them
            const clean = latex.replace(/^\$\$|\$\$S/g, '').replace(/^\\\[|\\\]$/g, '');
            
            containerRef.current.innerHTML = `$$${clean}$$`;
            
            window.MathJax.typesetPromise([containerRef.current])
                .then(() => {
                    // Success
                })
                .catch((err: any) => {
                    console.warn('MathJax Typeset Error:', err);
                    if (containerRef.current) containerRef.current.innerText = latex;
                });
        }
    }, 10);
    
    return () => clearTimeout(timer);
  }, [latex]);

  return (
    <div 
      ref={containerRef} 
      className="inline-block text-center text-cyber-glow overflow-x-auto max-w-full" 
      dir="ltr"
      style={{ minHeight: '2rem' }}
    />
  );
};