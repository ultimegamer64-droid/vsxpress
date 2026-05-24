import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { formatMoneyDOP, formatMoneyHTG } from '@/lib/formatMoney';

export const useWallet = () => {
  const { user } = useAuth();

  const [balanceHtg, setBalanceHtg] = useState(0);
  const [balanceDop, setBalanceDop] = useState(0);
  const [creditLimit, setCreditLimit] = useState(0);
  const [exchangeRate, setExchangeRate] = useState(1);
  const [loading, setLoading] = useState(true);

  const fetchWalletData = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const [walletRes, userRes] = await Promise.all([
        supabase
          .from('wallets')
          .select('balance_htg, balance_dop, credit_limit')
          .eq('user_id', user.id)
          .maybeSingle(),
        supabase
          .from('users')
          .select('exchange_rate, taux_change')
          .eq('id', user.id)
          .single()
      ]);

      if (walletRes.error) throw walletRes.error;
      if (userRes.error) throw userRes.error;

      const htg = Number(walletRes.data?.balance_htg) || 0;
      const dop = Number(walletRes.data?.balance_dop) || 0;
      const limit = Number(walletRes.data?.credit_limit) || 0;
      const rateRaw = Number(userRes.data?.exchange_rate) || Number(userRes.data?.taux_change) || 1;
      const rate = rateRaw > 0 ? rateRaw : 1;

      setBalanceHtg(htg);
      setBalanceDop(dop);
      setCreditLimit(limit);
      setExchangeRate(rate);
    } catch (error) {
      console.error('Error fetching wallet/rate:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchWalletData();

    const walletSub = supabase
      .channel(`wallet-realtime-${user?.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'wallets',
        filter: `user_id=eq.${user?.id}`
      }, (payload) => {
        if (payload.new) {
          setBalanceHtg(Number(payload.new.balance_htg) || 0);
          setBalanceDop(Number(payload.new.balance_dop) || 0);
          setCreditLimit(Number(payload.new.credit_limit) || 0);
        }
      })
      // FIX : Mise à jour du taux en temps réel quand l'admin le change
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'users',
        filter: `id=eq.${user?.id}`
      }, (payload) => {
        if (payload.new) {
          const rateRaw = Number(payload.new.exchange_rate) || Number(payload.new.taux_change) || 1;
          setExchangeRate(rateRaw > 0 ? rateRaw : 1);
        }
      })
      .subscribe();

    return () => { supabase.removeChannel(walletSub); };
  }, [user?.id, fetchWalletData]);

  const availableBalanceHtg = balanceHtg + (creditLimit * exchangeRate);
  const availableBalanceDop = balanceDop + creditLimit + (balanceHtg / (exchangeRate > 0 ? exchangeRate : 1));

  return {
    balanceHtg,
    balanceDop,
    creditLimit,
    exchangeRate,
    availableBalanceHtg,
    availableBalanceDop,
    formattedBalanceHtg: formatMoneyHTG(balanceHtg),
    formattedBalanceDop: formatMoneyDOP(balanceDop),
    formattedCreditLimit: formatMoneyDOP(creditLimit),
    formattedAvailableHtg: formatMoneyHTG(availableBalanceHtg),
    formattedAvailableDop: formatMoneyDOP(availableBalanceDop),
    loading,
    refreshWallet: fetchWalletData
  };
};

export default useWallet;