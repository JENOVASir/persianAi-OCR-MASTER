import React from 'react';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2, Download, Trash2, FileImage, RefreshCw, Eye, ChevronDown, ChevronUp, Github, Instagram } from 'lucide-react';

export const UploadIcon = ({ className }: { className?: string }) => <Upload className={className} />;
export const FileIcon = ({ className }: { className?: string }) => <FileText className={className} />;
export const CheckIcon = ({ className }: { className?: string }) => <CheckCircle className={className} />;
export const ErrorIcon = ({ className }: { className?: string }) => <AlertCircle className={className} />;
export const SpinnerIcon = ({ className }: { className?: string }) => <Loader2 className={`animate-spin ${className}`} />;
export const DownloadIcon = ({ className }: { className?: string }) => <Download className={className} />;
export const DeleteIcon = ({ className }: { className?: string }) => <Trash2 className={className} />;
export const ImageIcon = ({ className }: { className?: string }) => <FileImage className={className} />;
export const RetryIcon = ({ className }: { className?: string }) => <RefreshCw className={className} />;
export const EyeIcon = ({ className }: { className?: string }) => <Eye className={className} />;
export const ChevronDownIcon = ({ className }: { className?: string }) => <ChevronDown className={className} />;
export const ChevronUpIcon = ({ className }: { className?: string }) => <ChevronUp className={className} />;
export const GithubIcon = ({ className }: { className?: string }) => <Github className={className} />;
export const InstagramIcon = ({ className }: { className?: string }) => <Instagram className={className} />;