import React from 'react';
import { SpinnerIcon, CheckIcon } from './Icons';

interface ProcessingStepProps {
  label: string;
  status: 'waiting' | 'active' | 'done';
}

export const ProcessingStep: React.FC<ProcessingStepProps> = ({ label, status }) => {
  return (
    <div className={`flex items-center gap-2 text-sm ${status === 'waiting' ? 'opacity-50' : 'opacity-100'}`}>
      {status === 'active' && <SpinnerIcon className="w-4 h-4 text-brand-600" />}
      {status === 'done' && <CheckIcon className="w-4 h-4 text-green-500" />}
      {status === 'waiting' && <div className="w-4 h-4 rounded-full border-2 border-gray-300" />}
      <span className={status === 'active' ? 'font-medium text-brand-700' : ''}>{label}</span>
    </div>
  );
};
