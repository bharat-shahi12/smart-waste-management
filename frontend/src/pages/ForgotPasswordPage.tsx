import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, KeyRound, Lock, CheckCircle2 } from 'lucide-react';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock API Call
    setTimeout(() => {
      setLoading(false);
      setStep(2);
    }, 1000);
  };

  const handleVerifyOtp = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Mock API Call
    setTimeout(() => {
      setLoading(false);
      setStep(3);
    }, 1000);
  };

  const handleResetPassword = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    setLoading(true);
    // Mock API Call
    setTimeout(() => {
      setLoading(false);
      setStep(4);
    }, 1000);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 font-['Plus_Jakarta_Sans',sans-serif] p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl shadow-gray-200/50 p-8 border border-gray-100">
        
        {step === 1 && (
          <div>
            <div className="w-12 h-12 bg-[#EFFAF3] rounded-full flex items-center justify-center mb-6">
              <KeyRound className="w-6 h-6 text-[#008C44]" />
            </div>
            <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Forgot Password?</h2>
            <p className="text-[#64748B] mb-8 text-sm">No worries, we'll send you reset instructions.</p>
            
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#0F172A]">Email / Phone</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text" 
                    className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C44]/20 focus:border-[#008C44] transition-all text-[#0F172A]"
                    placeholder="Enter your email"
                    value={email} onChange={(e) => setEmail(e.target.value)} required
                  />
                </div>
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#008C44] hover:bg-[#007036] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#008C44]/20 transition-all duration-200 disabled:opacity-70">
                {loading ? 'Sending...' : 'Send Reset Link / OTP'}
              </button>
            </form>
            <div className="mt-8 text-center">
              <Link to="/login" className="text-sm font-bold text-[#64748B] hover:text-[#008C44]">← Back to log in</Link>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center mb-6">
              <Mail className="w-6 h-6 text-blue-500" />
            </div>
            <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Check your email</h2>
            <p className="text-[#64748B] mb-8 text-sm">We sent an OTP to {email}</p>
            
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#0F172A]">Enter OTP</label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C44]/20 focus:border-[#008C44] transition-all text-[#0F172A] text-center tracking-widest font-bold text-lg"
                  placeholder="000000"
                  maxLength={6}
                  value={otp} onChange={(e) => setOtp(e.target.value)} required
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#008C44] hover:bg-[#007036] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#008C44]/20 transition-all duration-200 disabled:opacity-70">
                {loading ? 'Verifying...' : 'Verify OTP'}
              </button>
            </form>
          </div>
        )}

        {step === 3 && (
          <div>
            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mb-6">
              <Lock className="w-6 h-6 text-orange-500" />
            </div>
            <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Set new password</h2>
            <p className="text-[#64748B] mb-8 text-sm">Must be at least 8 characters.</p>
            
            <form onSubmit={handleResetPassword} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#0F172A]">New Password</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C44]/20 focus:border-[#008C44] transition-all text-[#0F172A]"
                  placeholder="••••••••"
                  value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-sm font-bold text-[#0F172A]">Confirm Password</label>
                <input 
                  type="password" 
                  className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C44]/20 focus:border-[#008C44] transition-all text-[#0F172A]"
                  placeholder="••••••••"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                />
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#008C44] hover:bg-[#007036] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#008C44]/20 transition-all duration-200 disabled:opacity-70">
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>
            </form>
          </div>
        )}

        {step === 4 && (
          <div className="text-center">
            <div className="w-16 h-16 bg-[#EFFAF3] rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="w-8 h-8 text-[#008C44]" />
            </div>
            <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Password Updated</h2>
            <p className="text-[#64748B] mb-8 text-sm">Your password has been successfully reset. Click below to log in magically.</p>
            
            <button 
              onClick={() => navigate('/login')}
              className="w-full bg-[#008C44] hover:bg-[#007036] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#008C44]/20 transition-all duration-200"
            >
              Continue to Login
            </button>
          </div>
        )}

      </div>
    </div>
  );
}
