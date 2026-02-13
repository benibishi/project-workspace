
import React from 'react';
import { 
  CheckCircle2, 
  Clock, 
  XCircle, 
  Settings, 
  ClipboardCheck, 
  Plus, 
  Trash2, 
  ChevronRight, 
  Camera, 
  FileDown,
  ArrowLeft,
  AlertTriangle
} from 'lucide-react';

export const Icons = {
  Pass: CheckCircle2,
  InProgress: Clock,
  Fail: XCircle,
  Builder: Settings,
  Inspector: ClipboardCheck,
  Add: Plus,
  Delete: Trash2,
  Next: ChevronRight,
  Camera: Camera,
  Download: FileDown,
  Back: ArrowLeft,
  Alert: AlertTriangle
};

export const COLORS = {
  PASS: 'text-green-600 bg-green-50 border-green-200',
  IN_PROGRESS: 'text-amber-600 bg-amber-50 border-amber-200',
  FAIL: 'text-red-600 bg-red-50 border-red-200',
  ESCALATED: 'text-purple-700 bg-purple-100 border-purple-300'
};
