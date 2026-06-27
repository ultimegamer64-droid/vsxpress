import { supabase } from '@/lib/supabase';
import { default as i18next } from 'i18next';

export const checkTransactionStatus = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('get_transactions_status', { p_user_id: userId });

    if (error) {
      console.error('checkTransactionStatus:', error);
      return { allowed: false, message: i18next.t('error.transaction.checkFailed') };
    }

    if (data?.disabled) {
      return { allowed: false, message: i18next.t('error.transaction.disabled') };
    }

    return { allowed: true, message: null };
  } catch (err) {
    console.error('checkTransactionStatus unexpected:', err);
    return { allowed: false, message: i18next.t('error.unexpected') };
  }
};
