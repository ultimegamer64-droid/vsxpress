import { supabase } from '@/lib/supabase';

const ERROR_MESSAGES = {
  'Incorrect answer': 'Réponse incorrecte. Veuillez réessayer.',
  'User not found': 'Aucun compte trouvé avec cet email.',
  'No security question set for this user': "Ce compte n'a pas de question de sécurité configurée.",
  'Transfer not found': 'Transfert introuvable.',
  'Transfer is not pending': 'Ce transfert ne peut plus être traité.',
  'Transfer already processed': 'Ce transfert a déjà été traité.',
  'Invalid transfer amount': 'Montant du transfert invalide.',
  'transactions_disabled': 'Les transactions sont temporairement désactivées.',
  'Missing required fields': 'Champs obligatoires manquants.',
  'Unauthorized': 'Accès non autorisé.',
};

export const invokeFunction = async (functionName, body) => {
  const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/${functionName}`;
  
  const session = await supabase.auth.getSession();
  const token = session?.data?.session?.access_token;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();

  if (!response.ok || data?.error) {
    const raw = data?.error || data?.message || 'Une erreur est survenue.';
    const friendly = ERROR_MESSAGES[raw] || raw;
    throw new Error(friendly);
  }

  return data;
};