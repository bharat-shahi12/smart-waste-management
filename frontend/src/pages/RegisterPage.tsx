import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Mail, User, Phone, MapPin, Lock, CheckSquare, Square } from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [city, setCity] = useState('');
  const [role, setRole] = useState('USER');
  const [agreed, setAgreed] = useState(false);
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (password !== confirmPassword) {
      return setError('Passwords do not match.');
    }
    if (!agreed) {
      return setError('You must agree to the Terms & Privacy Policy.');
    }

    setLoading(true);
    try {
      const response = await api.post('/auth/register', { 
        name, email, password, phone, city, role
      });
      login(response.data.token, {
        id: response.data.userId,
        name: response.data.name,
        role: response.data.role
      });
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Left side - Banner */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#008C44] to-teal-700 relative overflow-hidden items-center justify-center p-12">
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30rem] h-[30rem] bg-teal-300/10 rounded-full blur-3xl"></div>
        
        <div className="relative z-10 text-white max-w-lg">
          <h1 className="text-5xl font-extrabold tracking-tight mb-6">Join Smart<span className="text-green-300">Waste</span></h1>
          <p className="text-xl text-green-50/90 leading-relaxed font-medium">
            Help us keep the city clean. Create an account to report issues, find nearby bins, and track cleanliness in your area.
          </p>
        </div>
      </div>

      {/* Right side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12">
        <div className="w-full max-w-md">
          <div className="mb-10 lg:hidden">
            <h1 className="text-4xl font-extrabold text-[#0F172A] tracking-tight">Smart<span className="text-[#008C44]">Waste</span></h1>
          </div>
          
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Create Account</h2>
          <p className="text-[#64748B] mb-8">Fill in your details to get started.</p>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl mb-6 text-sm font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C44]/20 focus:border-[#008C44] transition-all text-[#0F172A] placeholder-gray-400"
                placeholder="Full Name"
                value={name} onChange={(e) => setName(e.target.value)} required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="email" 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C44]/20 focus:border-[#008C44] transition-all text-[#0F172A] placeholder-gray-400"
                  placeholder="Email Address"
                  value={email} onChange={(e) => setEmail(e.target.value)} required
                />
              </div>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="text" 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C44]/20 focus:border-[#008C44] transition-all text-[#0F172A] placeholder-gray-400"
                  placeholder="Phone Number"
                  value={phone} onChange={(e) => setPhone(e.target.value)} required
                />
              </div>
            </div>

            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input 
                type="text" 
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C44]/20 focus:border-[#008C44] transition-all text-[#0F172A] placeholder-gray-400"
                placeholder="City / Area"
                value={city} onChange={(e) => setCity(e.target.value)} required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="password" 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C44]/20 focus:border-[#008C44] transition-all text-[#0F172A] placeholder-gray-400"
                  placeholder="Password"
                  value={password} onChange={(e) => setPassword(e.target.value)} required
                />
              </div>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input 
                  type="password" 
                  className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C44]/20 focus:border-[#008C44] transition-all text-[#0F172A] placeholder-gray-400"
                  placeholder="Confirm Password"
                  value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required
                />
              </div>
            </div>

            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <select 
                className="w-full pl-10 pr-4 py-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#008C44]/20 focus:border-[#008C44] transition-all text-[#0F172A] appearance-none"
                value={role} 
                onChange={(e) => setRole(e.target.value)}
              >
                <option value="USER">User / Citizen</option>
                <option value="COLLECTOR">Responder / Collector</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>

            <div className="flex items-center gap-3 pt-2 cursor-pointer" onClick={() => setAgreed(!agreed)}>
              {agreed ? <CheckSquare className="w-5 h-5 text-[#008C44]" /> : <Square className="w-5 h-5 text-gray-400" />}
              <span className="text-sm text-[#64748B] select-none">
                I agree to the <span className="text-[#008C44] font-semibold">Terms</span> & <span className="text-[#008C44] font-semibold">Privacy Policy</span>
              </span>
            </div>

            <button 
              type="submit" 
              disabled={loading}
              className="w-full bg-[#008C44] hover:bg-[#007036] text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-[#008C44]/20 transition-all duration-200 disabled:opacity-70 mt-6"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
          
          <div className="mt-8 text-center text-sm font-medium text-[#64748B]">
            Already have an account? <Link to="/login" className="text-[#008C44] font-bold hover:underline">Sign In</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
