import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

export default function PlaceholderPage({ title }: { title: string }) {
  return (
    <div className="min-h-screen text-[#A9A5BA] pb-20 flex flex-col items-center justify-center">
      <div className="bg-[#160E29] rounded-2xl p-10 border border-white/5 max-w-lg w-full text-center shadow-[0_0_50px_rgba(255,122,0,0.05)] relative overflow-hidden">
        <div className="absolute top-[-50px] left-1/2 -translate-x-1/2 w-32 h-32 bg-[#FF7A00]/20 rounded-full blur-[40px]"></div>
        
        <h1 className="text-3xl font-extrabold text-white mb-4 relative z-10">{title}</h1>
        <p className="text-sm text-[#A9A5BA] mb-8 relative z-10">
          This feature is currently under development. Please check back later.
        </p>
        
        <Link 
          to="/user/dashboard" 
          className="inline-flex items-center gap-2 bg-[#FF7A00] hover:bg-[#FF4D24] text-white font-bold py-3 px-6 rounded-xl shadow-[0_0_15px_rgba(255,122,0,0.4)] transition-all duration-300 relative z-10"
        >
          <ArrowLeft className="w-5 h-5" />
          Back to Dashboard
        </Link>
      </div>
    </div>
  );
}
