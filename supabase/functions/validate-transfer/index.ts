import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // FIX #4 : Vérification JWT — le caller doit être authentifié
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const authClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )
    const { data: { user: caller }, error: authError } = await authClient.auth.getUser()
    if (authError || !caller) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      )
    }

    const { transfer_id, worker_id, action, proof_url } = await req.json()

    if (!transfer_id || !worker_id) {
      throw new Error('Missing required fields')
    }

    // FIX #4 : L'appelant doit être le worker — pas de débit arbitraire d'un autre wallet
    if (caller.id !== worker_id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      )
    }

    const { data: transfer, error: transferError } = await supabase
      .from('transfers')
      .select('*')
      .eq('id', transfer_id)
      .single()

    if (transferError || !transfer) {
      throw new Error('Transfer not found')
    }

    if (transfer.status !== 'pending' && !(action === 'reject' && transfer.status === 'rejected')) {
      return new Response(
        JSON.stringify({ error: 'Transfer is not pending', status: 409 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 409 }
      )
    }

    if (action === 'reject') {
      // Idempotency check
      if (transfer.status === 'rejected') {
        return new Response(
          JSON.stringify({ success: true, message: 'Transfer already rejected', refunded: false }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        )
      }

      const agent_id = transfer.agent_id

      // Résolution du taux (pour le log seulement — le remboursement utilise total_htg)
      let rate = Number(transfer.exchange_rate_snapshot)
      let rateSource = 'snapshot'

      if (!rate || rate <= 0) {
        const { data: agent, error: agentError } = await supabase
          .from('users')
          .select('exchange_rate')
          .eq('id', agent_id)
          .single()

        if (agentError || !agent || !agent.exchange_rate) {
          throw new Error("Cannot reject transfer: exchange rate unavailable. Please contact support.")
        }

        rate = Number(agent.exchange_rate)
        rateSource = 'current'
      }

      if (!rate || rate <= 0) {
        throw new Error("Cannot reject transfer: exchange rate unavailable (invalid value). Please contact support.")
      }

      // FIX #2 : Remboursement = total_htg exact (ce qui a été débité), pas amount_dop * rate
      const refundAmount = Number(transfer.total_htg || 0)

      if (refundAmount <= 0) {
        throw new Error("Cannot compute refund: total_htg is missing or zero.")
      }

      if (agent_id) {
        const { data: wallet, error: walletFetchError } = await supabase
          .from('wallets')
          .select('balance_htg')
          .eq('user_id', agent_id)
          .single()

        if (walletFetchError && walletFetchError.code !== 'PGRST116') {
          throw new Error(`Failed to fetch agent wallet: ${walletFetchError.message}`)
        }

        const currentBalance = Number(wallet?.balance_htg || 0)
        const newBalance = currentBalance + refundAmount

        // FIX #1 : Optimistic locking — mise à jour conditionnelle sur la valeur lue
        // Empêche la race condition : l'UPDATE n'est exécuté que si balance_htg n'a pas changé
        const { data: updatedWallet, error: walletUpdateError } = await supabase
          .from('wallets')
          .update({
            balance_htg: newBalance,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', agent_id)
          .eq('balance_htg', currentBalance)
          .select('balance_htg')
          .single()

        if (walletUpdateError || !updatedWallet) {
          throw new Error('Failed to update agent wallet: concurrent modification detected, please retry')
        }

        const { error: txError } = await supabase.from('wallet_transactions').insert({
          user_id: agent_id,
          transfer_id: transfer_id,
          type: 'transfer_rejection_refund',
          amount_htg: refundAmount,
          balance_before: currentBalance,
          balance_after: newBalance,
          metadata: { description: `Remboursement transfert rejeté #${transfer_id}` },
          created_at: new Date().toISOString()
        })

        if (txError) {
          throw new Error(`Failed to create transaction record: ${txError.message}`)
        }
      }

      const { error: updateError } = await supabase
        .from('transfers')
        .update({ status: 'rejected' })
        .eq('id', transfer_id)

      if (updateError) {
        throw new Error(`Failed to update transfer status: ${updateError.message}`)
      }

      return new Response(
        JSON.stringify({
          success: true,
          refunded: true,
          refund_amount: refundAmount,
          rate_source: rateSource,
          message: 'Transfer rejected and agent refunded'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    if (action === 'validate') {
      // FIX #5 : Vérification statut transactions côté serveur
      const { data: txStatus } = await supabase.rpc('get_transactions_status', { p_user_id: worker_id })
      if (txStatus?.disabled) {
        return new Response(
          JSON.stringify({ error: 'transactions_disabled' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
        )
      }

      // FIX : Utiliser uniquement total_htg — pas de fallback ambigu sur transfer.amount
      const amount = Number(transfer.total_htg || 0)

      if (amount <= 0) {
        throw new Error('Invalid transfer amount')
      }

      // Le worker est CRÉDITÉ quand il valide (il reçoit le HTG pour avoir livré le cash)
      const delta = amount

      const { data: wallet, error: walletFetchError } = await supabase
        .from('wallets')
        .select('balance_htg')
        .eq('user_id', worker_id)
        .single()

      if (walletFetchError) {
        throw new Error(`Failed to fetch worker wallet: ${walletFetchError.message}`)
      }

      const currentBalance = Number(wallet?.balance_htg || 0)
      const newBalance = currentBalance + delta

      // FIX #1 : Optimistic locking — protection contre la race condition
      const { data: updatedWallet, error: walletError } = await supabase
        .from('wallets')
        .update({
          balance_htg: newBalance,
          updated_at: new Date().toISOString()
        })
        .eq('user_id', worker_id)
        .eq('balance_htg', currentBalance)
        .select('balance_htg')
        .single()

      if (walletError || !updatedWallet) {
        throw new Error('Failed to update wallet: concurrent modification detected, please retry')
      }

      await supabase.from('wallet_transactions').insert({
        user_id: worker_id,
        transfer_id: transfer_id,
        type: 'transfer_validation',
        amount_htg: delta,
        balance_before: currentBalance,
        balance_after: newBalance,
        metadata: { description: `Validation transfer #${transfer_id}` },
        created_at: new Date().toISOString()
      })

      const { error: updateError } = await supabase
        .from('transfers')
        .update({
          status: 'validated',
          proof_url: proof_url || null,
        })
        .eq('id', transfer_id)

      if (updateError) throw updateError

      return new Response(
        JSON.stringify({ success: true, new_balance: newBalance }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      )
    }

    throw new Error('Invalid action')

  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
