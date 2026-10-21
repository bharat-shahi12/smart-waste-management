import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { User, Mail, MapPin, Building, Hash, LogOut, Trash2, Edit2, Shield, Settings, Check, Phone, Globe } from 'lucide-react';
import api from '../../services/api';

export default function ResponderProfile() {
  const { logout, updateUser } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  // Password change states
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '' });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await api.get('/profile');
      setProfile(res.data);
      setEditForm(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setEditForm({
      ...editForm,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    });
  };

  const saveProfile = async () => {
    setIsSaving(true);
    try {
      const res = await api.put('/profile', editForm);
      setProfile(res.data);
      updateUser(res.data);
      setIsEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');
    try {
      await api.post('/profile/change-password', passwordForm);
      setPassSuccess('Password updated successfully!');
      setPasswordForm({ currentPassword: '', newPassword: '' });
      setTimeout(() => setIsChangingPassword(false), 2000);
    } catch (err: any) {
      setPassError(err.response?.data?.message || 'Failed to change password');
    }
  };

  const handleDeleteAccount = async () => {
    if (window.confirm("Are you sure you want to delete your account? This action cannot be undone and all your impact data will be lost.")) {
      try {
        await api.delete('/profile');
        logout();
        navigate('/login');
      } catch (err) {
        console.error(err);
      }
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (loading) return <div className="p-8 text-center text-[#A9A5BA]">Loading Profile...</div>;

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12 p-4 md:p-8 font-['Plus_Jakarta_Sans',sans-serif]">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 mb-8">
        <div>
          <h1 className="text-[32px] font-extrabold text-[#FF7A00] tracking-wide flex items-center gap-3">
            <User className="w-10 h-10" />
            My Profile
          </h1>
          <p className="text-[#A9A5BA] mt-2 text-sm font-medium">Manage your personal information and preferences</p>
        </div>
        
        {saveSuccess && (
          <div className="px-4 py-2 bg-green-500/20 text-green-400 border border-green-500/30 rounded-xl flex items-center gap-2 animate-pulse">
            <Check className="w-5 h-5" />
            <span className="font-bold text-sm">Profile Saved</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Avatar & Quick Actions */}
        <div className="space-y-6">
          <div className="bg-[#120822] rounded-[24px] border border-white/5 p-6 shadow-[0_10px_40px_rgba(0,0,0,0.3)] text-center relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-[#FF7A00]/10 rounded-full blur-[40px] -mr-16 -mt-16 pointer-events-none"></div>
             
             <div className="w-24 h-24 mx-auto rounded-full bg-gradient-to-br from-[#1A0B2E] to-[#FF7A00]/20 border-2 border-[#FF7A00] flex items-center justify-center text-[#FF7A00] mb-4 relative z-10 shadow-[0_0_20px_rgba(255,122,0,0.2)]">
               <span className="text-3xl font-black">{profile?.name?.charAt(0) || 'U'}</span>
             </div>
             <h2 className="text-xl font-bold text-white mb-1 relative z-10">{profile?.name}</h2>
             <p className="text-[#A9A5BA] text-sm relative z-10">{profile?.email}</p>
             
             <div className="mt-6 pt-6 border-t border-white/5 space-y-3 relative z-10">
               <button 
                 onClick={() => setIsChangingPassword(!isChangingPassword)}
                 className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors text-sm"
               >
                 <Shield className="w-4 h-4" />
                 {isChangingPassword ? 'Cancel Password Change' : 'Change Password'}
               </button>
             </div>
          </div>
          
          <div className="bg-red-500/5 rounded-[24px] border border-red-500/10 p-6">
            <h3 className="text-red-400 font-bold mb-4 flex items-center gap-2">Danger Zone</h3>
            <div className="space-y-3">
              <button 
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 py-3 bg-white/5 hover:bg-white/10 text-white font-bold rounded-xl transition-colors text-sm"
              >
                <LogOut className="w-4 h-4" />
                Logout Current Session
              </button>
              <button 
                onClick={handleDeleteAccount}
                className="w-full flex items-center justify-center gap-2 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold rounded-xl transition-colors text-sm"
              >
                <Trash2 className="w-4 h-4" />
                Delete Account Forever
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Details Form */}
        <div className="lg:col-span-2 space-y-6">
          
          {isChangingPassword && (
            <div className="bg-[#120822] rounded-[24px] border border-[#FF7A00]/30 p-6 shadow-[0_0_20px_rgba(255,122,0,0.1)]">
              <h3 className="text-white font-bold text-lg mb-4">Change Password</h3>
              <form onSubmit={handlePasswordChange} className="space-y-4">
                {passError && <div className="text-red-400 text-sm bg-red-400/10 p-3 rounded-xl border border-red-400/20">{passError}</div>}
                {passSuccess && <div className="text-green-400 text-sm bg-green-400/10 p-3 rounded-xl border border-green-400/20">{passSuccess}</div>}
                
                <div>
                  <label className="block text-xs font-bold text-[#A9A5BA] uppercase mb-1">Current Password</label>
                  <input 
                    type="password"
                    value={passwordForm.currentPassword}
                    onChange={e => setPasswordForm({...passwordForm, currentPassword: e.target.value})}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF7A00]/50 focus:ring-1 focus:ring-[#FF7A00]/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#A9A5BA] uppercase mb-1">New Password</label>
                  <input 
                    type="password"
                    value={passwordForm.newPassword}
                    onChange={e => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#FF7A00]/50 focus:ring-1 focus:ring-[#FF7A00]/50"
                  />
                </div>
                <div className="pt-2 flex justify-end">
                  <button type="submit" className="px-6 py-2 bg-[#FF7A00] hover:bg-[#FF8F2D] text-white font-bold rounded-xl transition-colors text-sm shadow-[0_0_15px_rgba(255,122,0,0.3)]">
                    Update Password
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-[#120822] rounded-[24px] border border-white/5 p-6 md:p-8 shadow-[0_10px_40px_rgba(0,0,0,0.3)] relative">
            <div className="flex justify-between items-center mb-6">
               <h3 className="text-xl font-bold text-white flex items-center gap-2">
                 <Settings className="w-5 h-5 text-[#FF7A00]" />
                 Account Details
               </h3>
               {!isEditing ? (
                 <button 
                   onClick={() => setIsEditing(true)}
                   className="flex items-center gap-2 px-4 py-2 bg-[#FF7A00]/10 hover:bg-[#FF7A00]/20 text-[#FF7A00] font-bold rounded-xl transition-colors text-sm"
                 >
                   <Edit2 className="w-4 h-4" />
                   Edit Profile
                 </button>
               ) : (
                 <div className="flex items-center gap-2">
                   <button 
                     onClick={() => { setIsEditing(false); setEditForm(profile); }}
                     className="px-4 py-2 bg-white/5 hover:bg-white/10 text-[#A9A5BA] font-bold rounded-xl transition-colors text-sm"
                   >
                     Cancel
                   </button>
                   <button 
                     onClick={saveProfile}
                     disabled={isSaving}
                     className="px-4 py-2 bg-[#FF7A00] hover:bg-[#FF8F2D] text-white font-bold rounded-xl transition-colors text-sm shadow-[0_0_15px_rgba(255,122,0,0.3)]"
                   >
                     {isSaving ? 'Saving...' : 'Save Changes'}
                   </button>
                 </div>
               )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#A9A5BA] uppercase mb-2 flex items-center gap-2"><User className="w-4 h-4"/> Full Name</label>
                  {isEditing ? (
                    <input name="name" value={editForm.name || ''} onChange={handleEditChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" />
                  ) : (
                    <div className="text-white font-medium px-4 py-2 bg-white/5 rounded-xl border border-transparent">{profile?.name || 'Not provided'}</div>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-[#A9A5BA] uppercase mb-2 flex items-center gap-2"><Phone className="w-4 h-4"/> Phone Number</label>
                  {isEditing ? (
                    <input name="phone" value={editForm.phone || ''} onChange={handleEditChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" />
                  ) : (
                    <div className="text-white font-medium px-4 py-2 bg-white/5 rounded-xl border border-transparent">{profile?.phone || 'Not provided'}</div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A9A5BA] uppercase mb-2 flex items-center gap-2"><Mail className="w-4 h-4"/> Email Address</label>
                  <div className="text-white/50 font-medium px-4 py-2 bg-white/5 rounded-xl border border-transparent cursor-not-allowed" title="Email cannot be changed">
                    {profile?.email}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-[#A9A5BA] uppercase mb-2 flex items-center gap-2"><MapPin className="w-4 h-4"/> Address</label>
                  {isEditing ? (
                    <input name="address" value={editForm.address || ''} onChange={handleEditChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" />
                  ) : (
                    <div className="text-white font-medium px-4 py-2 bg-white/5 rounded-xl border border-transparent">{profile?.address || 'Not provided'}</div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-[#A9A5BA] uppercase mb-2 flex items-center gap-2"><Building className="w-4 h-4"/> City</label>
                    {isEditing ? (
                      <input name="city" value={editForm.city || ''} onChange={handleEditChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" />
                    ) : (
                      <div className="text-white font-medium px-4 py-2 bg-white/5 rounded-xl border border-transparent">{profile?.city || 'Not provided'}</div>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#A9A5BA] uppercase mb-2 flex items-center gap-2"><Hash className="w-4 h-4"/> PIN Code</label>
                    {isEditing ? (
                      <input name="pincode" value={editForm.pincode || ''} onChange={handleEditChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" />
                    ) : (
                      <div className="text-white font-medium px-4 py-2 bg-white/5 rounded-xl border border-transparent">{profile?.pincode || 'Not provided'}</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#A9A5BA] uppercase mb-2 flex items-center gap-2"><Globe className="w-4 h-4"/> Saved Area / Zone</label>
                  {isEditing ? (
                    <input name="savedArea" value={editForm.savedArea || ''} onChange={handleEditChange} placeholder="e.g. Sector 62" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white" />
                  ) : (
                    <div className="text-white font-medium px-4 py-2 bg-white/5 rounded-xl border border-transparent">{profile?.savedArea || 'Not set'}</div>
                  )}
                </div>
              </div>
            </div>

            {/* Preferences */}
            <div className="mt-8 pt-6 border-t border-white/5">
              <h4 className="text-white font-bold mb-4">Preferences</h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-xs font-bold text-[#A9A5BA] uppercase mb-2">Language</label>
                  {isEditing ? (
                    <select name="language" value={editForm.language || 'en'} onChange={handleEditChange} className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white outline-none">
                      <option value="en" className="bg-[#120822]">English</option>
                      <option value="hi" className="bg-[#120822]">Hindi</option>
                      <option value="mr" className="bg-[#120822]">Marathi</option>
                    </select>
                  ) : (
                    <div className="text-white font-medium">{profile?.language === 'hi' ? 'Hindi' : profile?.language === 'mr' ? 'Marathi' : 'English'}</div>
                  )}
                </div>
                
                <div className="flex items-center justify-between">
                  <div>
                    <label className="block text-xs font-bold text-[#A9A5BA] uppercase mb-1">Push Notifications</label>
                    <p className="text-[#A9A5BA] text-[11px]">Receive updates about your activities</p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      name="notificationsEnabled"
                      checked={isEditing ? editForm.notificationsEnabled : profile?.notificationsEnabled} 
                      onChange={handleEditChange}
                      disabled={!isEditing}
                      className="sr-only peer" 
                    />
                    <div className="w-11 h-6 bg-white/10 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#FF7A00]"></div>
                  </label>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
