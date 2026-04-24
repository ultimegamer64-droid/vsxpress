import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, XCircle, RefreshCw, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { formatDateTimeLocal } from '@/lib/dateUtils';
import { formatMoneyDOP, formatMoneyHTG } from '@/lib/formatMoney';

const ValidateTransfers = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { t } = useTranslation();
  const { user } = useAuth();

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('transfers')
        .select(`
          *,
          agent:agent_id (nom, prenom)
        `)
        .eq('worker_id', user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTransfers(data || []);
    } catch (error) {
      console.error('Error fetching transfers:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('error.fetchFailed')
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    fetchTransfers();

    const subscription = supabase
      .channel(`worker-validate-${user.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'transfers',
        filter: `worker_id=eq.${user.id}`
      }, () => {
        fetchTransfers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, [user]);

  return (
    <>
      <Helmet>
        <title>{t('dashboard.worker.stats.pending')} - Worker - VS XPRESS</title>
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] p-6">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-between items-center mb-8"
          >
            <div>
              <Button
                onClick={() => navigate('/worker/dashboard')}
                variant="ghost"
                className="text-[#A0A0A0] hover:text-[#D4AF37] mb-4"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                {t('buttons.backToDashboard')}
              </Button>
              <h1 className="text-3xl font-bold text-[#FFFFFF]">{t('dashboard.worker.stats.pending')}</h1>
            </div>
            <Button
              onClick={fetchTransfers}
              variant="outline"
              className="border-[#2A2A2A] text-[#A0A0A0]"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              {t('common.refresh')}
            </Button>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1E1E1E] rounded-xl border border-[#2A2A2A] overflow-hidden"
          >
            {loading && transfers.length === 0 ? (
              <div className="p-12 text-center text-[#A0A0A0]">
                <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2" />
                {t('common.loading')}
              </div>
            ) : transfers.length === 0 ? (
              <div className="p-12 text-center text-[#A0A0A0]">
                <CheckCircle2 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-xl">{t('common.noData')}</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-[#0B0B0B] border-b border-[#2A2A2A]">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.agent')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('transfer.beneficiary')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.amountRD')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.amountHTG')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.date')}</th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-[#A0A0A0]">{t('tables.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.map((transfer, index) => (
                      <motion.tr
                        key={transfer.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-b border-[#2A2A2A] hover:bg-[#0B0B0B] transition-colors"
                      >
                        <td className="px-6 py-4 text-[#FFFFFF]">
                          {transfer.agent?.prenom} {transfer.agent?.nom}
                        </td>
                        <td className="px-6 py-4">
                          <p className="text-white font-medium">{transfer.beneficiary_name}</p>
                          <p className="text-[#A0A0A0] text-xs">{transfer.beneficiary_phone}</p>
                        </td>
                        <td className="px-6 py-4 text-[#FFFFFF] font-mono">
                          {formatMoneyDOP(transfer.amount_dop)}
                        </td>
                        <td className="px-6 py-4 text-[#D4AF37] font-bold font-mono">
                          {formatMoneyHTG(transfer.total_htg)}
                        </td>
                        <td className="px-6 py-4 text-[#A0A0A0] text-sm">
                          {formatDateTimeLocal(transfer.created_at)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => navigate(`/worker/transfer/${transfer.id}`)}
                              className="bg-[#10B981] hover:bg-[#059669] text-white rounded-lg"
                            >
                              <CheckCircle2 className="w-4 h-4 mr-1" />
                              {t('buttons.validate')}
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => navigate(`/worker/transfer/${transfer.id}`)}
                              variant="outline"
                              className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white rounded-lg"
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              {t('buttons.reject')}
                            </Button>
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </>
  );
};

export default ValidateTransfers;