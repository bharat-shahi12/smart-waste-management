import { useState, useEffect } from 'react';
import { Cpu, CheckCircle2, History, AlertTriangle, RefreshCw } from 'lucide-react';
import api, { getImageUrl } from '../../services/api';
import type { WasteDetection } from '../../types';
import { useLiveRefresh } from '../../services/liveEvents';

export default function UserAiDetection() {
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<WasteDetection | null>(null);
  const [error, setError] = useState('');
  const [history, setHistory] = useState<WasteDetection[]>([]);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await api.get('/ai/my-history');
      setHistory(res.data);
    } catch (err) {
      console.log('Failed to fetch history', err);
    }
  };

  useLiveRefresh(fetchHistory, ['DETECTION', 'RECONNECTED']);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('Image size must be less than 5MB');
        return;
      }
      setImage(file);
      setImagePreview(URL.createObjectURL(file));
      setError('');
      setResult(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) {
      setError('Please select an image first.');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('image', image);

    try {
      const res = await api.post('/ai/detect', formData);
      setResult(res.data);
      fetchHistory(); // Refresh history
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to analyze image. AI service might be unavailable.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-center justify-between">
        <div className="md:w-1/2">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Waste Detection</h1>
            <p className="text-gray-500 mb-6">Upload a photo of your waste and our AI will automatically classify it and tell you the best way to dispose of it.</p>
            
            {error && (
                <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm border border-red-100 flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{error}</p>
                </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="w-full">
                    <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-2xl hover:border-[#FF7A00] transition-colors bg-gray-50 relative overflow-hidden">
                        <div className="space-y-1 text-center relative z-10">
                            {imagePreview ? (
                                <div className="flex flex-col items-center">
                                    <img src={imagePreview} alt="Preview" className="h-40 object-cover rounded-xl mb-3 shadow-md" />
                                    <button type="button" onClick={(e) => {e.preventDefault(); setImage(null); setImagePreview(''); setResult(null);}} className="text-sm bg-white px-3 py-1 rounded-full text-red-600 hover:bg-red-50 shadow-sm font-medium">Remove Image</button>
                                </div>
                            ) : (
                                <>
                                    <Cpu className="mx-auto h-12 w-12 text-gray-400 mb-3" />
                                    <div className="flex text-sm text-gray-600 justify-center">
                                        <label className="relative cursor-pointer bg-transparent rounded-md font-bold text-[#FF7A00] hover:text-orange-600 focus-within:outline-none">
                                            <span>Upload a photo</span>
                                            <input type="file" className="sr-only" accept="image/jpeg, image/png, image/webp" onChange={handleImageChange} />
                                        </label>
                                        <p className="pl-1">or take a picture</p>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">PNG, JPG up to 5MB</p>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                <button 
                    type="submit" 
                    disabled={loading || !image}
                    className="w-full bg-[#FF7A00] text-white font-bold py-3.5 px-4 rounded-xl shadow-md hover:bg-orange-600 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                    {loading ? (
                        <><RefreshCw className="w-5 h-5 animate-spin" /> Analyzing Image...</>
                    ) : (
                        <><Cpu className="w-5 h-5" /> Detect Waste</>
                    )}
                </button>
            </form>
        </div>

        <div className="md:w-1/2 w-full">
            {result ? (
                <div className="bg-gradient-to-br from-indigo-900 to-[#160E29] p-8 rounded-3xl text-white shadow-xl relative overflow-hidden h-full flex flex-col justify-center border border-indigo-800">
                    <div className="absolute top-0 right-0 p-6 opacity-10">
                        <Cpu className="w-32 h-32" />
                    </div>
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 text-indigo-300 font-bold mb-6 text-sm uppercase tracking-wider">
                            <CheckCircle2 className="w-5 h-5 text-green-400" /> Analysis Complete
                        </div>
                        <h3 className="text-4xl font-extrabold text-white mb-2">{result.detectedCategory}</h3>
                        <div className="flex items-center gap-3 mb-8">
                            <div className="bg-white/10 px-3 py-1 rounded-full text-sm font-medium backdrop-blur-sm">
                                {result.confidence}% Match
                            </div>
                        </div>
                        
                        <div className="bg-white/10 rounded-2xl p-5 backdrop-blur-sm border border-white/10">
                            <h4 className="text-sm font-bold text-indigo-300 mb-2 uppercase tracking-wide">Recommended Action</h4>
                            <p className="text-lg leading-relaxed text-indigo-50">{result.recommendedDisposal}</p>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl h-[400px] flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                    <Cpu className="w-16 h-16 mb-4 opacity-30" />
                    <p className="font-medium text-lg text-gray-500">Awaiting Image</p>
                    <p className="text-sm mt-2">Upload a photo to see the AI classification results here.</p>
                </div>
            )}
        </div>
      </div>

      {history.length > 0 && (
        <div className="bg-white p-6 md:p-8 rounded-2xl shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 mb-6">
                <History className="w-5 h-5 text-gray-500" />
                <h3 className="text-xl font-bold text-gray-900">Scan History</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {history.map(item => (
                    <div key={item.id} className="border border-gray-100 rounded-xl p-4 flex gap-4 hover:shadow-md transition">
                        <img src={getImageUrl(item.imageUrl)} alt={item.detectedCategory} className="w-20 h-20 object-cover rounded-lg shadow-sm" />
                        <div>
                            <h4 className="font-bold text-gray-900">{item.detectedCategory}</h4>
                            <p className="text-xs text-gray-500 mt-1">{item.confidence}% Confidence</p>
                            <p className="text-xs text-gray-400 mt-2">{new Date(item.createdAt).toLocaleDateString()}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
      )}
    </div>
  );
}
