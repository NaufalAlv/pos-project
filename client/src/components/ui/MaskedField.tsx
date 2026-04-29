import React, { useState, useCallback } from 'react';
import { Eye, EyeOff, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { canUnmask, getUserRole } from '@/utils/permissions';
import api from '@/utils/api';

interface MaskedFieldProps {
  fieldName: string;
  maskedValue: string;
  customerUid: string;
  className?: string;
}

type UnmaskState = 'masked' | 'loading' | 'revealed' | 'error' | 'forbidden';

const MaskedField: React.FC<MaskedFieldProps> = ({ 
  fieldName, 
  maskedValue, 
  customerUid,
  className 
}) => {
  const [state, setState] = useState<UnmaskState>('masked');
  const [revealedValue, setRevealedValue] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  const userRole = getUserRole();
  const isAllowedByRole = canUnmask(fieldName, userRole);

  const handleReveal = useCallback(async () => {
    if (!isAllowedByRole) {
      setState('forbidden');
      return;
    }

    setState('loading');
    
    try {
      const response = await api.post(`/customers/${customerUid}/unmask/${fieldName}`, {
        reason: 'user_requested',
        context: window.location.pathname 
      });

      setRevealedValue(response.data.value);
      setState('revealed');
      
      const SENSITIVE_FIELDS = ['tax_id', 'bank_account'];
      if (SENSITIVE_FIELDS.includes(fieldName)) {
        setTimeout(() => {
          setState('masked');
          setRevealedValue(null);
        }, 30000);
      }

    } catch (error: any) {
      if (error.response?.status === 403) {
        setState('forbidden');
        setErrorMsg('Access denied.');
      } else if (error.response?.status === 429) {
        setState('error');
        setErrorMsg('Too many unmask requests.');
      } else {
        setState('error');
        setErrorMsg('Failed to retrieve data.');
      }
    }
  }, [customerUid, fieldName, isAllowedByRole]);

  const handleHide = () => {
    setState('masked');
    setRevealedValue(null);
  };

  return (
    <div className={`flex items-center gap-2 ${className || ''}`}>
      <span className={`font-bold tracking-widest ${state === 'revealed' ? 'text-neutral' : 'text-slate-400 opacity-60'}`}>
        {state === 'revealed' && revealedValue ? revealedValue : maskedValue}
      </span>

      {isAllowedByRole && (
        <button
          onClick={state === 'revealed' ? handleHide : handleReveal}
          disabled={state === 'loading'}
          className="p-1 text-slate-300 hover:text-primary transition-colors focus:outline-none"
          title={state === 'revealed' ? 'Hide' : 'Reveal'}
        >
          {state === 'loading' && <Loader2 size={14} className="animate-spin" />}
          {state === 'revealed' && <EyeOff size={14} />}
          {(state === 'masked' || state === 'error') && <Eye size={14} />}
        </button>
      )}

      {!isAllowedByRole && (
        <span title="Insufficient permissions">
          <Lock size={14} className="text-slate-300" />
        </span>
      )}

      {(state === 'error' || state === 'forbidden') && (
        <div className="flex items-center gap-1 text-red-500 text-[10px]">
          <AlertCircle size={10} />
          <span>{errorMsg || 'Denied'}</span>
        </div>
      )}
    </div>
  );
};

export default MaskedField;
