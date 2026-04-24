import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import { motion } from 'framer-motion';
import { useAuth } from '@/hooks/useAuth';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Mail, Lock, Loader2, UserPlus, MapPin, Phone, Smartphone } from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { supabase } from '@/lib/supabase';
import ConfirmModal from '@/components/ConfirmModal';

const ROLE_HOME = {
  admin: '/admin/dashboard',
  agent: '/agent/dashboard',
  worker: '/worker/dashboard',
  'special-agent': '/special-agent/dashboard',
};

const Login = () => {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { signIn, user, role, hasSecurityQuestion } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isRegistrationOpen, setIsRegistrationOpen] = useState(false);
  const [isSubmittingRegistration, setIsSubmittingRegistration] = useState(false);
  const [registrationForm, setRegistrationForm] = useState({
    nom: '', prenom: '', adresse: '', email: '', whatsapp_number: ''
  });
  const [successPopupOpen, setSuccessPopupOpen] = useState(false);

  useEffect(() => {
    if (!user) return;
    if (!hasSecurityQuestion) {
      navigate('/auth/set-security-question', { replace: true });
      return;
    }
    if (role) {
      const path = ROLE_HOME[role];
      if (path) navigate(path, { replace: true });
      else toast({ variant: 'destructive', title: t('common.error'), description: t('messages.validationError') });
    }
  }, [user, role, hasSecurityQuestion, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const { error } = await signIn(email, password);
      if (error) throw error;
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('messages.invalidCredentials') || error.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationSubmit = async (e) => {
    e.preventDefault();
    setIsSubmittingRegistration(true);
    try {
      if (!registrationForm.nom || !registrationForm.prenom || !registrationForm.whatsapp_number || !registrationForm.email || !registrationForm.adresse) {
        throw new Error(t('auth.registration.fillAllFields'));
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(registrationForm.email)) {
        throw new Error(t('auth.registration.invalidEmail'));
      }
      if (!/^[0-9+\-\s()]+$/.test(registrationForm.whatsapp_number)) {
        throw new Error(t('auth.registration.invalidWhatsapp'));
      }

      const { error } = await supabase.from('registration_requests').insert([{ ...registrationForm, viewed: false }]);
      if (error) throw error;

      setIsRegistrationOpen(false);
      setRegistrationForm({ nom: '', prenom: '', adresse: '', email: '', whatsapp_number: '' });
      setSuccessPopupOpen(true);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: t('auth.registration.errorMessage'),
        description: error.message || t('auth.registration.errorDescription'),
      });
    } finally {
      setIsSubmittingRegistration(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setRegistrationForm(prev => ({ ...prev, [name]: value }));
  };

  return (
    <>
      <Helmet>
        <title>{t('auth.login.title')} | VS XPRESS ENTREPRISE</title>
        <meta name="description" content="Secure login to VS XPRESS ENTREPRISE" />
      </Helmet>

      <div className="min-h-screen bg-[#0B0B0B] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <motion.div initial={{ scale: 0.8 }} animate={{ scale: 1 }} transition={{ duration: 0.5 }} className="mb-6">
              <img src="/logo.png" alt="VS XPRESS ENTREPRISE Logo" className="h-24 mx-auto rounded-lg" />
            </motion.div>
            <h1 className="text-3xl font-bold text-[#FFFFFF] mb-2">{t('auth.login.title')}</h1>
            <p className="text-[#A0A0A0]">{t('auth.login.subtitle')}</p>
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="bg-[#1E1E1E] rounded-2xl p-8 shadow-2xl border border-[#2A2A2A] space-y-6"
          >
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-[#A0A0A0]">{t('auth.login.email')}</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0A0A0]" />
                  <Input id="email" type="email" placeholder={t('auth.login.emailPlaceholder')} value={email}
                    onChange={(e) => setEmail(e.target.value)} required
                    className="pl-10 bg-[#0B0B0B] border-[#2A2A2A] text-[#FFFFFF] focus:border-[#D4AF37] focus:ring-[#D4AF37]" />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label htmlFor="password" className="text-[#A0A0A0]">{t('auth.login.password')}</Label>
                  <Link to="/auth/reset-password" className="text-xs text-[#D4AF37] hover:underline">
                    {t('auth.login.forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#A0A0A0]" />
                  <Input id="password" type="password" placeholder={t('auth.login.passwordPlaceholder')} value={password}
                    onChange={(e) => setPassword(e.target.value)} required
                    className="pl-10 bg-[#0B0B0B] border-[#2A2A2A] text-[#FFFFFF] focus:border-[#D4AF37] focus:ring-[#D4AF37]" />
                </div>
              </div>

              <Button type="submit" disabled={isLoading}
                className="w-full bg-[#D4AF37] hover:bg-[#B8941F] text-[#0B0B0B] font-semibold py-6 rounded-xl">
                {isLoading ? <><Loader2 className="w-5 h-5 animate-spin mr-2" />{t('auth.login.loading')}</> : t('auth.login.button')}
              </Button>
            </form>

            <div className="pt-4 border-t border-[#2A2A2A]">
              <Button type="button" variant="outline"
                className="w-full border-[#D4AF37] text-[#D4AF37] hover:bg-[#D4AF37]/10"
                onClick={() => setIsRegistrationOpen(true)}>
                <UserPlus className="w-4 h-4 mr-2" />
                {t('auth.registration.createAccount')}
              </Button>
            </div>

            <div className="pt-2">
              <Link to="/download" className="w-full flex items-center justify-center gap-2 text-sm text-[#A0A0A0] hover:text-[#D4AF37] transition-colors py-2">
                <Smartphone className="w-4 h-4" />
                Télécharger l'application Android
              </Link>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <Dialog open={isRegistrationOpen} onOpenChange={setIsRegistrationOpen}>
        <DialogContent className="bg-[#1E1E1E] border-[#2A2A2A] text-white sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#D4AF37]">{t('auth.registration.title')}</DialogTitle>
            <DialogDescription className="text-[#A0A0A0]">{t('auth.registration.description')}</DialogDescription>
          </DialogHeader>

          <form onSubmit={handleRegistrationSubmit} className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nom" className="text-sm font-medium text-[#EAEAEA]">{t('auth.registration.lastName')} *</Label>
                <Input id="nom" name="nom" value={registrationForm.nom} onChange={handleInputChange} required
                  className="bg-[#0B0B0B] border-[#2A2A2A] text-white" placeholder="Dupont" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="prenom" className="text-sm font-medium text-[#EAEAEA]">{t('auth.registration.firstName')} *</Label>
                <Input id="prenom" name="prenom" value={registrationForm.prenom} onChange={handleInputChange} required
                  className="bg-[#0B0B0B] border-[#2A2A2A] text-white" placeholder="Jean" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="whatsapp_number" className="text-sm font-medium text-[#EAEAEA]">{t('auth.registration.whatsapp')} *</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                <Input id="whatsapp_number" name="whatsapp_number" value={registrationForm.whatsapp_number} onChange={handleInputChange} required
                  className="pl-9 bg-[#0B0B0B] border-[#2A2A2A] text-white" placeholder="+1 829 123 4567" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#EAEAEA]">{t('auth.registration.email')} *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                <Input id="email" name="email" type="email" value={registrationForm.email} onChange={handleInputChange} required
                  className="pl-9 bg-[#0B0B0B] border-[#2A2A2A] text-white" placeholder="jean@example.com" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="adresse" className="text-sm font-medium text-[#EAEAEA]">{t('auth.registration.address')} *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A0A0]" />
                <Input id="adresse" name="adresse" value={registrationForm.adresse} onChange={handleInputChange} required
                  className="pl-9 bg-[#0B0B0B] border-[#2A2A2A] text-white" placeholder="Votre ville ou quartier" />
              </div>
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsRegistrationOpen(false)}
                className="border-[#2A2A2A] text-white hover:bg-[#2A2A2A]">
                {t('auth.registration.cancel')}
              </Button>
              <Button type="submit" disabled={isSubmittingRegistration} className="bg-[#D4AF37] text-black hover:bg-[#B8941F]">
                {isSubmittingRegistration
                  ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{t('auth.registration.submitting')}</>
                  : t('auth.registration.submitRequest')}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <ConfirmModal
        isOpen={successPopupOpen}
        onClose={() => setSuccessPopupOpen(false)}
        title={t('auth.registration.successMessage')}
        message={t('auth.registration.successDescription')}
        mode="success"
        autoCloseMs={0}
      />
    </>
  );
};

export default Login;