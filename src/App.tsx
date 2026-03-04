import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Truck, 
  RotateCcw, 
  AlertTriangle, 
  Settings as SettingsIcon, 
  Users, 
  FileText, 
  Plus, 
  TrendingUp, 
  Wallet,
  Menu,
  X,
  ChevronRight,
  Search,
  LogOut,
  Eye,
  EyeOff,
  Coins,
  Edit,
  User as UserIcon,
  History,
  Phone,
  MapPin,
  Lock
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';
import { format } from 'date-fns';
import html2pdf from 'html2pdf.js';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell
} from 'recharts';
import type { Product, Settings, MasterData, Operation, Expense, User } from './types';

// --- Components ---

const Card = ({ children, className, id }: { children: React.ReactNode; className?: string; id?: string; key?: React.Key }) => (
  <div id={id} className={cn("bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden", className)}>
    {children}
  </div>
);

const Dues = ({ role }: { role?: string }) => {
  const [dues, setDues] = useState<any[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [showCollect, setShowCollect] = useState(false);
  const [selectedDue, setSelectedDue] = useState<any>(null);
  const [collectAmount, setCollectAmount] = useState(0);
  const [newDue, setNewDue] = useState({ customer_name: '', amount: 0, date: new Date().toISOString().split('T')[0] });

  const canEdit = role !== 'staff';

  const fetchDues = async () => {
    try {
      const res = await fetch('/api/dues');
      setDues(await res.json());
    } catch (err) {
      console.error("Failed to fetch dues:", err);
    }
  };

  useEffect(() => { fetchDues(); }, []);

  const handleAdd = async () => {
    await fetch('/api/dues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDue)
    });
    setShowAdd(false);
    setNewDue({ customer_name: '', amount: 0, date: new Date().toISOString().split('T')[0] });
    fetchDues();
  };

  const handleCollect = async () => {
    if (!selectedDue) return;
    await fetch('/api/dues/collect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        due_id: selectedDue.id,
        amount_collected: collectAmount
      })
    });
    setShowCollect(false);
    setSelectedDue(null);
    setCollectAmount(0);
    fetchDues();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">বাকি (Dues) ম্যানেজমেন্ট</h1>
        {canEdit && (
          <Button onClick={() => setShowAdd(true)} className="bg-amber-500 hover:bg-amber-600">
            <Plus size={18} /> নতুন বাকি যোগ করুন
          </Button>
        )}
      </div>

      <Card className="border-amber-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-amber-50 border-bottom border-amber-100">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-amber-700">ক্রেতার নাম</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-amber-700">তারিখ</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-amber-700 text-right">মোট বাকি</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-amber-700 text-right">অবশিষ্ট</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-amber-700 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-amber-50">
              {dues.map(d => (
                <tr key={d.id} className="hover:bg-amber-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{d.customer_name}</td>
                  <td className="px-6 py-4 text-slate-600">{d.date}</td>
                  <td className="px-6 py-4 text-right text-slate-400 line-through">৳{(d.total_amount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-right font-bold text-amber-600">৳{(d.remaining_amount || 0).toLocaleString()}</td>
                  <td className="px-6 py-4 text-center">
                    {canEdit && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="border-amber-200 text-amber-700 hover:bg-amber-50"
                        onClick={() => {
                          setSelectedDue(d);
                          setCollectAmount(d.remaining_amount);
                          setShowCollect(true);
                        }}
                      >
                        আদায় করুন
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {dues.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-400 italic">কোনো বকেয়া হিসাব পাওয়া যায়নি।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold">নতুন বাকি যোগ করুন</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <Input label="ক্রেতার নাম" value={newDue.customer_name} onChange={e => setNewDue({...newDue, customer_name: e.target.value})} />
                <Input label="তারিখ" type="date" value={newDue.date} onChange={e => setNewDue({...newDue, date: e.target.value})} />
                <Input label="পরিমাণ (৳)" type="number" value={newDue.amount} onChange={e => setNewDue({...newDue, amount: parseFloat(e.target.value)})} />
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>বাতিল</Button>
                <Button className="flex-1 bg-amber-500 hover:bg-amber-600" onClick={handleAdd}>সংরক্ষণ করুন</Button>
              </div>
            </motion.div>
          </div>
        )}

        {showCollect && selectedDue && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold">বাকি আদায় করুন</h3>
                <button onClick={() => setShowCollect(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="p-4 bg-amber-50 rounded-xl border border-amber-100">
                  <div className="text-sm text-amber-600 font-bold uppercase tracking-wider">ক্রেতা</div>
                  <div className="text-lg font-black text-slate-900">{selectedDue.customer_name}</div>
                  <div className="mt-2 flex justify-between items-end">
                    <div>
                      <div className="text-xs text-slate-400 uppercase font-bold">অবশিষ্ট বাকি</div>
                      <div className="text-xl font-black text-amber-600">৳{(selectedDue.remaining_amount || 0).toLocaleString()}</div>
                    </div>
                  </div>
                </div>
                <Input 
                  label="আদায়ের পরিমাণ (৳)" 
                  type="number" 
                  max={selectedDue.remaining_amount}
                  value={collectAmount} 
                  onChange={e => setCollectAmount(parseFloat(e.target.value))} 
                />
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowCollect(false)}>বাতিল</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700" onClick={handleCollect}>আদায় নিশ্চিত করুন</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Button = ({ 
  children, 
  variant = 'primary', 
  className, 
  ...props 
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'outline' | 'danger' }) => {
  const variants = {
    primary: 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200 shadow-lg',
    secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
    outline: 'border border-slate-200 text-slate-600 hover:bg-slate-50',
    danger: 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-100'
  };
  return (
    <button 
      className={cn(
        "px-4 py-2 rounded-xl font-medium transition-all active:scale-95 disabled:opacity-50 disabled:pointer-events-none flex items-center justify-center gap-2",
        variants[variant],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
};

const Input = ({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <input 
      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
      {...props}
    />
  </div>
);

const Select = ({ label, options, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string; options: { value: string | number; label: string }[] }) => (
  <div className="space-y-1.5">
    {label && <label className="text-sm font-medium text-slate-700">{label}</label>}
    <select 
      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all appearance-none"
      {...props}
    >
      <option value="">Select Option</option>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

// --- Pages ---

const Profit = () => {
  const [profitData, setProfitData] = useState<{
    totalGrossProfit: number;
    totalExpenses: number;
    netProfit: number;
    monthlyAnalysis: any[];
  }>({ 
    totalGrossProfit: 0, 
    totalExpenses: 0, 
    netProfit: 0, 
    monthlyAnalysis: [] 
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch('/api/profit/analysis');
        const data = await res.json();
        setProfitData(data);
      } catch (err) {
        console.error("Failed to fetch profit analysis:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) {
    return <div className="text-center py-20 text-slate-400 italic">প্রফিট এনালাইসিস লোড হচ্ছে...</div>;
  }

  return (
    <div className="space-y-6 pb-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">প্রফিট ও লস এনালাইসিস</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 border-emerald-100 bg-emerald-50/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
              <TrendingUp size={20} />
            </div>
            <div className="text-sm font-bold text-emerald-600 uppercase tracking-wider">মোট গ্রস প্রফিট</div>
          </div>
          <div className="text-3xl font-black text-emerald-700">৳{profitData.totalGrossProfit.toLocaleString()}</div>
          <p className="text-xs text-slate-500 mt-2">বিক্রয়ের উপর নির্ধারিত % হারে মোট লাভ</p>
        </Card>

        <Card className="p-6 border-rose-100 bg-rose-50/30">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
              <TrendingUp size={20} className="rotate-180" />
            </div>
            <div className="text-sm font-bold text-rose-600 uppercase tracking-wider">মোট ব্যয়</div>
          </div>
          <div className="text-3xl font-black text-rose-700">৳{profitData.totalExpenses.toLocaleString()}</div>
          <p className="text-xs text-slate-500 mt-2">ব্যবসার যাবতীয় খরচ বাদ দিয়ে</p>
        </Card>

        <Card className={cn("p-6 border-indigo-100", profitData.netProfit >= 0 ? "bg-indigo-50/30" : "bg-red-50/30")}>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
              <Coins size={20} />
            </div>
            <div className="text-sm font-bold text-indigo-600 uppercase tracking-wider">নিট প্রফিট</div>
          </div>
          <div className={cn("text-3xl font-black", profitData.netProfit >= 0 ? "text-indigo-700" : "text-red-700")}>
            ৳{profitData.netProfit.toLocaleString()}
          </div>
          <p className="text-xs text-slate-500 mt-2">সব খরচ বাদ দিয়ে প্রকৃত লাভ</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">মাসিক প্রফিট বনাম ব্যয়</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={profitData.monthlyAnalysis}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis 
                  dataKey="month" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#64748b', fontSize: 12 }}
                  tickFormatter={(value) => `৳${value}`}
                />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  formatter={(value: number) => [`৳${value.toLocaleString()}`, '']}
                />
                <Bar dataKey="grossProfit" name="গ্রস প্রফিট" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="expenses" name="ব্যয়" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 border-slate-100">
          <h3 className="text-lg font-bold text-slate-900 mb-6">মাসিক বিস্তারিত রিপোর্ট</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100">
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500">মাস</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 text-right">গ্রস প্রফিট</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 text-right">ব্যয়</th>
                  <th className="px-4 py-3 text-xs font-bold uppercase text-slate-500 text-right">নিট প্রফিট</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {profitData.monthlyAnalysis.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-slate-700">{item.month}</td>
                    <td className="px-4 py-3 text-right text-emerald-600 font-bold">৳{item.grossProfit.toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-rose-600 font-bold">৳{item.expenses.toLocaleString()}</td>
                    <td className={cn(
                      "px-4 py-3 text-right font-black",
                      item.netProfit >= 0 ? "text-indigo-600" : "text-red-600"
                    )}>
                      ৳{item.netProfit.toLocaleString()}
                    </td>
                  </tr>
                ))}
                {profitData.monthlyAnalysis.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-slate-400 italic">কোনো ডাটা পাওয়া যায়নি।</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
};

const Login = ({ onLogin }: { onLogin: (user: User) => void }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      const data = await res.json();
      if (data.success) {
        onLogin(data.user);
      } else {
        setError('ভুল ইউজারনেম অথবা পাসওয়ার্ড!');
      }
    } catch (err) {
      setError('সার্ভারে সমস্যা হচ্ছে। পরে চেষ্টা করুন।');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-3xl shadow-xl shadow-indigo-200 mx-auto mb-4">D</div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">DealerFlow</h1>
        </div>

        <Card className="p-8 shadow-2xl border-indigo-50">
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm font-bold flex items-center gap-2">
                <AlertTriangle size={18} /> {error}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">ইউজারনেম</label>
              <div className="relative">
                <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text"
                  required
                  placeholder="আপনার ইউজারনেম লিখুন"
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700">পাসওয়ার্ড</label>
              <div className="relative">
                <Wallet className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="আপনার পাসওয়ার্ড লিখুন"
                  className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-medium"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                />
                <button 
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full py-4 text-lg font-black tracking-wide"
              disabled={loading}
            >
              {loading ? 'লগইন হচ্ছে...' : 'লগইন করুন'}
            </Button>
          </form>
        </Card>

        <p className="text-center mt-8 text-slate-400 text-sm font-medium">
          © 2024 DealerFlow. All rights reserved. <br />
          Powered by Mahfuzur
        </p>
      </motion.div>
    </div>
  );
};

const ChangePasswordModal = ({ user, onClose }: { user: User; onClose: () => void }) => {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSave = async () => {
    if (newPassword !== confirmPassword) {
      alert('নতুন পাসওয়ার্ড দুটি মিলছে না!');
      return;
    }
    if (newPassword.length < 4) {
      alert('পাসওয়ার্ড অন্তত ৪ অক্ষরের হতে হবে!');
      return;
    }

    const res = await fetch('/api/users/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, oldPassword, newPassword })
    });
    const data = await res.json();
    if (data.success) {
      alert('পাসওয়ার্ড সফলভাবে পরিবর্তন করা হয়েছে!');
      onClose();
    } else {
      alert(data.error || 'পাসওয়ার্ড পরিবর্তন করতে সমস্যা হয়েছে');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xl font-bold">পাসওয়ার্ড পরিবর্তন করুন</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <Input label="পুরানো পাসওয়ার্ড" type="password" value={oldPassword} onChange={e => setOldPassword(e.target.value)} />
          <Input label="নতুন পাসওয়ার্ড" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
          <Input label="নতুন পাসওয়ার্ড নিশ্চিত করুন" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
        </div>
        <div className="p-6 bg-slate-50 flex gap-3">
          <Button variant="outline" className="flex-1" onClick={onClose}>বাতিল</Button>
          <Button className="flex-1 bg-indigo-600" onClick={handleSave}>সংরক্ষণ করুন</Button>
        </div>
      </motion.div>
    </div>
  );
};

const UserManagement = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newUser, setNewUser] = useState({ username: '', password: '', role: 'staff', full_name: '' });

  const fetchUsers = async () => {
    const res = await fetch('/api/users');
    setUsers(await res.json());
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleAdd = async () => {
    await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    });
    setShowAdd(false);
    fetchUsers();
  };

  const handleDelete = async (id: number) => {
    if (confirm('আপনি কি নিশ্চিত যে আপনি এই ইউজারটি ডিলিট করতে চান?')) {
      await fetch(`/api/users/${id}`, { method: 'DELETE' });
      fetchUsers();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">ইউজার ম্যানেজমেন্ট</h1>
        <Button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700">
          <Plus size={18} /> নতুন ইউজার যোগ করুন
        </Button>
      </div>

      <Card className="border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-bottom border-slate-200">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">নাম</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">ইউজারনেম</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">রোল</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{u.full_name}</td>
                  <td className="px-6 py-4 text-slate-600">{u.username}</td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-md text-xs font-bold border",
                      u.role === 'admin' ? "bg-purple-50 text-purple-600 border-purple-100" :
                      u.role === 'manager' ? "bg-blue-50 text-blue-600 border-blue-100" :
                      "bg-slate-50 text-slate-600 border-slate-100"
                    )}>
                      {u.role.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Button variant="danger" size="sm" onClick={() => handleDelete(u.id)}>ডিলিট</Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold">নতুন ইউজার যোগ করুন</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <Input label="পূর্ণ নাম" value={newUser.full_name} onChange={e => setNewUser({...newUser, full_name: e.target.value})} />
                <Input label="ইউজারনেম" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} />
                <Input label="পাসওয়ার্ড" type="password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} />
                <Select 
                  label="রোল" 
                  options={[
                    { value: 'admin', label: 'Admin' },
                    { value: 'manager', label: 'Manager' },
                    { value: 'staff', label: 'Staff' }
                  ]} 
                  value={newUser.role} 
                  onChange={e => setNewUser({...newUser, role: e.target.value as any})} 
                />
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>বাতিল</Button>
                <Button className="flex-1" onClick={handleAdd}>সংরক্ষণ করুন</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const MasterDataManagement = ({ masters, onRefresh, role }: { masters: MasterData, onRefresh: () => void, role?: string }) => {
  const canEdit = role !== 'staff';
  const [activeSubTab, setActiveSubTab] = useState<'routes' | 'srs' | 'delivery_boys' | 'vans'>('routes');
  const [showAdd, setShowAdd] = useState(false);
  const [newValue, setNewValue] = useState('');

  const handleAdd = async () => {
    const payload = activeSubTab === 'vans' ? { van_no: newValue } : { name: newValue };
    await fetch(`/api/masters/${activeSubTab}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setNewValue('');
    setShowAdd(false);
    onRefresh();
  };

  const handleDelete = async (id: number) => {
    if (confirm('আপনি কি নিশ্চিত যে আপনি এটি ডিলিট করতে চান?')) {
      await fetch(`/api/masters/${activeSubTab}/${id}`, { method: 'DELETE' });
      onRefresh();
    }
  };

  const tabs = [
    { id: 'routes', label: 'রুট' },
    { id: 'srs', label: 'এসআর' },
    { id: 'delivery_boys', label: 'ডেলিভারি বয়' },
    { id: 'vans', label: 'ভ্যান' },
  ];

  const currentData = masters[activeSubTab];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">মাস্টার ডাটা ম্যানেজমেন্ট</h1>
        {canEdit && (
          <Button onClick={() => setShowAdd(true)} className="bg-indigo-600 hover:bg-indigo-700">
            <Plus size={18} /> নতুন যোগ করুন
          </Button>
        )}
      </div>

      <div className="flex bg-slate-100 p-1 rounded-xl w-fit">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActiveSubTab(t.id as any)}
            className={cn(
              "px-6 py-2 rounded-lg text-sm font-bold transition-all",
              activeSubTab === t.id ? "bg-white text-indigo-600 shadow-sm" : "text-slate-500 hover:text-slate-700"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <Card className="border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-bottom border-slate-200">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">নাম/নম্বর</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {currentData.map((d: any) => (
                <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{d.name || d.van_no}</td>
                  <td className="px-6 py-4 text-center">
                    {canEdit && (
                      <Button variant="danger" size="sm" onClick={() => handleDelete(d.id)}>ডিলিট</Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold">নতুন {tabs.find(t => t.id === activeSubTab)?.label} যোগ করুন</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6">
                <Input 
                  label={activeSubTab === 'vans' ? "ভ্যান নম্বর" : "নাম"} 
                  value={newValue} 
                  onChange={e => setNewValue(e.target.value)} 
                />
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>বাতিল</Button>
                <Button className="flex-1" onClick={handleAdd}>সংরক্ষণ করুন</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Dashboard = ({ stats }: { stats: any }) => {
  const data = [
    { name: 'সোম', sales: 0 },
    { name: 'মঙ্গল', sales: 0 },
    { name: 'বুধ', sales: 0 },
    { name: 'বৃহস্পতি', sales: 0 },
    { name: 'শুক্র', sales: 0 },
    { name: 'শনি', sales: 0 },
    { name: 'রবি', sales: 0 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">ড্যাশবোর্ড ওভারভিউ</h1>
        <div className="text-sm text-slate-500 font-medium bg-white px-4 py-2 rounded-xl shadow-sm border border-slate-100">
          {format(new Date(), 'EEEE, MMMM do yyyy')}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="p-6 bg-gradient-to-br from-indigo-500 to-purple-600 text-white border-none shadow-xl shadow-indigo-200">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">আজকের বিক্রয়</span>
          </div>
          <div className="text-3xl font-bold">৳{stats.todaySales.toLocaleString()}</div>
          <div className="mt-2 text-sm opacity-80">+১২% গতকালের তুলনায়</div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-amber-400 to-orange-500 text-white border-none shadow-xl shadow-amber-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <Wallet className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">মোট বাকি</span>
          </div>
          <div className="text-3xl font-bold">৳{stats.totalDues.toLocaleString()}</div>
          <div className="mt-2 text-sm opacity-80">১৪ জন কাস্টমারের কাছে পাওনা</div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-rose-500 to-red-600 text-white border-none shadow-xl shadow-red-100">
          <div className="flex items-center justify-between mb-4">
            <div className="p-2 bg-white/20 rounded-lg">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider opacity-80">কম স্টক</span>
          </div>
          <div className="text-3xl font-bold">{stats.lowStockCount} টি আইটেম</div>
          <div className="mt-2 text-sm opacity-80 font-medium">দ্রুত স্টক পূর্ণ করা প্রয়োজন</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="p-6 border-indigo-50">
          <h3 className="text-lg font-bold mb-6 text-indigo-900">সাপ্তাহিক বিক্রয় পারফরম্যান্স</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="sales" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={32}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index % 2 === 0 ? '#4f46e5' : '#818cf8'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-6 border-slate-100">
          <h3 className="text-lg font-bold mb-6 text-slate-900">সাম্প্রতিক কার্যক্রম</h3>
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shadow-sm",
                    i % 2 === 0 ? "bg-emerald-100 text-emerald-600" : "bg-blue-100 text-blue-600"
                  )}>
                    {i % 2 === 0 ? <RotateCcw size={18} /> : <Truck size={18} />}
                  </div>
                  <div>
                    <div className="font-medium text-slate-900">{i % 2 === 0 ? 'রিটার্ন' : 'ইস্যু'} - রুট এ</div>
                    <div className="text-xs text-slate-500">এসআর: মাহফুজুর রহমান • ১০:৩০ AM</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-slate-900">৳১,২০০</div>
                  <div className="text-xs text-slate-400">১২ টি আইটেম</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

const Inventory = ({ products, onRefresh, role }: { products: Product[], onRefresh: () => void, role?: string }) => {
  const isAdmin = role === 'admin';
  const canEdit = isAdmin;
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [stockUpdate, setStockUpdate] = useState({ cartons: 0, pieces: 0 });
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: '',
    pieces_per_carton: 12,
    unit_price: 0,
    min_stock_level: 10,
    cartons: 0,
    pieces: 0,
    profit_percent: 0
  });
  const [editProduct, setEditProduct] = useState<any>(null);

  const handleAdd = async () => {
    await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newProduct)
    });
    setShowAdd(false);
    setNewProduct({
      name: '',
      category: '',
      pieces_per_carton: 12,
      unit_price: 0,
      min_stock_level: 10,
      cartons: 0,
      pieces: 0,
      profit_percent: 0
    });
    onRefresh();
  };

  const handleEdit = async () => {
    if (!editProduct) return;
    await fetch(`/api/products/${editProduct.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editProduct)
    });
    setShowEdit(false);
    setEditProduct(null);
    onRefresh();
  };

  const handleUpdateStock = async () => {
    if (!selectedProduct) return;
    await fetch('/api/stock/add', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        product_id: selectedProduct.id,
        cartons: stockUpdate.cartons,
        pieces: stockUpdate.pieces
      })
    });
    setShowStockModal(false);
    setStockUpdate({ cartons: 0, pieces: 0 });
    onRefresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">ইনভেন্টরি ম্যানেজমেন্ট</h1>
        {canEdit && (
          <Button onClick={() => setShowAdd(true)} className="bg-emerald-600 hover:bg-emerald-700">
            <Plus size={18} /> নতুন পণ্য যোগ করুন
          </Button>
        )}
      </div>

      <Card className="border-emerald-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-emerald-50 border-bottom border-emerald-100">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-emerald-700">পণ্যের নাম</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-emerald-700">ক্যাটাগরি</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-emerald-700">স্টক (কাটুন / পিস)</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-emerald-700">মূল্য</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-emerald-700">অবস্থা</th>
                {canEdit && <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-emerald-700 text-center">অ্যাকশন</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-emerald-50">
              {products.map(p => (
                <tr key={p.id} className="hover:bg-emerald-50/50 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-900">{p.name}</td>
                  <td className="px-6 py-4 text-slate-600">{p.category}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded-md text-sm font-bold">{p.cartons} কাটুন</span>
                      <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-md text-sm font-bold">{p.pieces} পিস</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-bold text-slate-900">৳{p.unit_price}</td>
                  <td className="px-6 py-4">
                    {(p.cartons * p.pieces_per_carton + p.pieces) < p.min_stock_level ? (
                      <span className="px-2.5 py-1 bg-red-50 text-red-600 rounded-full text-xs font-bold border border-red-100">স্টক কম</span>
                    ) : (
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-600 rounded-full text-xs font-bold border border-emerald-100">স্টক আছে</span>
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-6 py-4 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                          onClick={() => {
                            setSelectedProduct(p);
                            setShowStockModal(true);
                          }}
                        >
                          স্টক যোগ করুন
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="border-slate-200 text-slate-600 hover:bg-slate-50"
                          onClick={() => {
                            setEditProduct(p);
                            setShowEdit(true);
                          }}
                        >
                          <Edit size={14} />
                        </Button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <h3 className="text-lg font-bold">নতুন পণ্য যোগ করুন</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto">
                <Input label="পণ্যের নাম" placeholder="যেমন: কোকা কোলা ৫০০মি.লি." value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} />
                <Input label="ক্যাটাগরি" placeholder="যেমন: পানীয়" value={newProduct.category} onChange={e => setNewProduct({...newProduct, category: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="প্রতি কার্টুনে পিস" type="number" value={newProduct.pieces_per_carton} onChange={e => setNewProduct({...newProduct, pieces_per_carton: parseInt(e.target.value)})} />
                  <Input label="ইউনিট মূল্য (৳)" type="number" value={newProduct.unit_price} onChange={e => setNewProduct({...newProduct, unit_price: parseFloat(e.target.value)})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="প্রাথমিক কাটুন" type="number" value={newProduct.cartons} onChange={e => setNewProduct({...newProduct, cartons: parseInt(e.target.value)})} />
                  <Input label="প্রাথমিক পিস" type="number" value={newProduct.pieces} onChange={e => setNewProduct({...newProduct, pieces: parseInt(e.target.value)})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="সর্বনিম্ন স্টক লেভেল" type="number" value={newProduct.min_stock_level} onChange={e => setNewProduct({...newProduct, min_stock_level: parseInt(e.target.value)})} />
                  <Input label="প্রফিট (%)" type="number" value={newProduct.profit_percent} onChange={e => setNewProduct({...newProduct, profit_percent: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="p-4 bg-slate-50 flex gap-3 sticky bottom-0 z-10">
                <Button variant="outline" className="flex-1 py-2" onClick={() => setShowAdd(false)}>বাতিল</Button>
                <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 py-2" onClick={handleAdd}>সংরক্ষণ করুন</Button>
              </div>
            </motion.div>
          </div>
        )}

        {showEdit && editProduct && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
                <h3 className="text-lg font-bold">পণ্য সংশোধন করুন</h3>
                <button onClick={() => setShowEdit(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={18} />
                </button>
              </div>
              <div className="p-4 space-y-3 overflow-y-auto">
                <Input label="পণ্যের নাম" value={editProduct.name} onChange={e => setEditProduct({...editProduct, name: e.target.value})} />
                <Input label="ক্যাটাগরি" value={editProduct.category} onChange={e => setEditProduct({...editProduct, category: e.target.value})} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="প্রতি কার্টুনে পিস" type="number" value={editProduct.pieces_per_carton} onChange={e => setEditProduct({...editProduct, pieces_per_carton: parseInt(e.target.value)})} />
                  <Input label="ইউনিট মূল্য (৳)" type="number" value={editProduct.unit_price} onChange={e => setEditProduct({...editProduct, unit_price: parseFloat(e.target.value)})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="সর্বনিম্ন স্টক লেভেল" type="number" value={editProduct.min_stock_level} onChange={e => setEditProduct({...editProduct, min_stock_level: parseInt(e.target.value)})} />
                  <Input label="প্রফিট (%)" type="number" value={editProduct.profit_percent} onChange={e => setEditProduct({...editProduct, profit_percent: parseFloat(e.target.value)})} />
                </div>
              </div>
              <div className="p-4 bg-slate-50 flex gap-3 sticky bottom-0 z-10">
                <Button variant="outline" className="flex-1 py-2" onClick={() => setShowEdit(false)}>বাতিল</Button>
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700 py-2" onClick={handleEdit}>আপডেট করুন</Button>
              </div>
            </motion.div>
          </div>
        )}

        {showStockModal && selectedProduct && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold">স্টক যোগ করুন</h3>
                  <p className="text-sm text-slate-500">{selectedProduct.name}</p>
                </div>
                <button onClick={() => setShowStockModal(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input label="অতিরিক্ত কাটুন" type="number" value={stockUpdate.cartons} onChange={e => setStockUpdate({...stockUpdate, cartons: parseInt(e.target.value)})} />
                  <Input label="অতিরিক্ত পিস" type="number" value={stockUpdate.pieces} onChange={e => setStockUpdate({...stockUpdate, pieces: parseInt(e.target.value)})} />
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowStockModal(false)}>বাতিল</Button>
                <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={handleUpdateStock}>আপডেট করুন</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Operations = ({ products, masters, onRefresh, role }: { products: Product[], masters: MasterData, onRefresh: () => void, role?: string }) => {
  const canEdit = role !== 'staff';
  const [type, setType] = useState<'issue' | 'return' | 'damage'>('issue');
  const [selectedItems, setSelectedItems] = useState<{ product_id: number, cartons: number, pieces: number }[]>([]);
  const [form, setForm] = useState({
    date: new Date().toISOString().split('T')[0],
    sr_id: '',
    route_id: '',
    delivery_boy_id: '',
    van_id: ''
  });
  const [issuedItems, setIssuedItems] = useState<any[]>([]);

  useEffect(() => {
    if ((type === 'return' || type === 'damage') && form.date && form.delivery_boy_id) {
      fetch(`/api/issued-items/${form.date}/${form.delivery_boy_id}`)
        .then(res => res.json())
        .then(data => {
          setIssuedItems(data.items || []);
          setSelectedItems((data.items || []).map((item: any) => ({
            product_id: item.product_id,
            cartons: 0,
            pieces: 0
          })));
          
          if (data.metadata) {
            setForm(prev => ({
              ...prev,
              sr_id: data.metadata.sr_id.toString(),
              route_id: data.metadata.route_id.toString(),
              van_id: data.metadata.van_id.toString()
            }));
          }
        });
    } else if (type === 'issue') {
      setIssuedItems([]);
      setSelectedItems([]);
    }
  }, [type, form.date, form.delivery_boy_id]);

  const addItem = () => {
    setSelectedItems([...selectedItems, { product_id: 0, cartons: 0, pieces: 0 }]);
  };

  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...selectedItems];
    newItems[index] = { ...newItems[index], [field]: value };
    setSelectedItems(newItems);
  };

  const handleSave = async () => {
    // Required fields validation for Issue
    if (type === 'issue') {
      if (!form.delivery_boy_id || !form.sr_id || !form.route_id || !form.van_id) {
        alert('অনুগ্রহ করে ডেলিভারি বয়, এসআর, রুট এবং ভ্যান নং সিলেক্ট করুন!');
        return;
      }

      // Stock validation for Issue
      for (const item of selectedItems) {
        if (item.product_id > 0) {
          const product = products.find(p => p.id === item.product_id);
          if (product) {
            const totalRequestedPieces = (item.cartons * product.pieces_per_carton) + item.pieces;
            const totalAvailablePieces = (product.cartons * product.pieces_per_carton) + product.pieces;
            
            if (totalRequestedPieces > totalAvailablePieces) {
              alert(`${product.name}-এর পর্যাপ্ত স্টক নেই! বর্তমান স্টক: ${product.cartons}C / ${product.pieces}P`);
              return;
            }
          }
        }
      }
    }

    const payload = {
      ...form,
      type,
      items: selectedItems.filter(i => i.product_id > 0)
    };
    await fetch('/api/operations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    setSelectedItems([]);
    onRefresh();
    alert('অপারেশন সফলভাবে সম্পন্ন হয়েছে!');
  };

  const typeLabels = {
    issue: 'ইস্যু',
    return: 'রিটার্ন',
    damage: 'ড্যামেজ'
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">দৈনিক অপারেশন</h1>
        <div className="flex bg-slate-100 p-1 rounded-xl shadow-inner">
          {(['issue', 'return', 'damage'] as const).map(t => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={cn(
                "px-6 py-2 rounded-lg text-sm font-bold capitalize transition-all",
                type === t 
                  ? (t === 'issue' ? "bg-blue-600 text-white shadow-md" : t === 'return' ? "bg-emerald-600 text-white shadow-md" : "bg-red-600 text-white shadow-md")
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {typeLabels[t]}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        <Card className="p-6 border-slate-100">
          <h3 className="font-bold text-slate-900 border-b border-slate-100 pb-2 mb-4">অপারেশনাল বিবরণ</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
            <Input label="তারিখ" type="date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} />
            
            <Select 
              label="ডেলিভারি বয়" 
              options={masters.delivery_boys.map(d => ({ value: d.id, label: d.name }))} 
              value={form.delivery_boy_id} 
              onChange={e => setForm({...form, delivery_boy_id: e.target.value})} 
            />

            <Select 
              label="এসআর-এর নাম" 
              options={masters.srs.map(s => ({ value: s.id, label: s.name }))} 
              value={form.sr_id} 
              onChange={e => setForm({...form, sr_id: e.target.value})} 
              disabled={type === 'return' || type === 'damage'}
            />
            <Select 
              label="রুট" 
              options={masters.routes.map(r => ({ value: r.id, label: r.name }))} 
              value={form.route_id} 
              onChange={e => setForm({...form, route_id: e.target.value})} 
              disabled={type === 'return' || type === 'damage'}
            />
            <Select 
              label="ভ্যান নং" 
              options={masters.vans.map(v => ({ value: v.id, label: v.van_no }))} 
              value={form.van_id} 
              onChange={e => setForm({...form, van_id: e.target.value})} 
              disabled={type === 'return' || type === 'damage'}
            />
          </div>
        </Card>

        <Card className="p-6 space-y-4 border-slate-100">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-900">পণ্যের তালিকা</h3>
          </div>

          <div className="space-y-3">
            {selectedItems.map((item, idx) => {
              const issued = issuedItems.find(i => i.product_id === item.product_id);
              return (
                <div key={idx} className="grid grid-cols-12 gap-3 items-end bg-slate-50 p-3 rounded-xl border border-slate-100 shadow-sm">
                  <div className={cn(type === 'return' || type === 'damage' ? "col-span-4" : "col-span-6")}>
                    {type === 'return' || type === 'damage' ? (
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">পণ্য</label>
                        <div className="p-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700">
                          {issued?.product_name || products.find(p => p.id === item.product_id)?.name}
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Select 
                          label="পণ্য" 
                          options={products
                            .filter(p => !selectedItems.some((si, sidx) => si.product_id === p.id && sidx !== idx))
                            .map(p => ({ 
                              value: p.id, 
                              label: `${p.name} (স্টক: ${p.cartons}C / ${p.pieces}P)` 
                            }))} 
                          value={item.product_id}
                          onChange={e => updateItem(idx, 'product_id', parseInt(e.target.value))}
                        />
                        {item.product_id > 0 && (
                          <div className="text-[10px] font-bold text-indigo-600 px-1">
                            বর্তমান স্টক: {products.find(p => p.id === item.product_id)?.cartons}C / {products.find(p => p.id === item.product_id)?.pieces}P
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                  {(type === 'return' || type === 'damage') && (
                    <div className="col-span-2">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">ইস্যু করা</label>
                        <div className="p-2.5 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl font-bold text-center text-xs">
                          {issued ? `${issued.cartons}C / ${issued.pieces}P` : '0C / 0P'}
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="col-span-2">
                    <Input label={type === 'return' ? "রিটার্ন কাটুন" : type === 'damage' ? "ড্যামেজ কাটুন" : "কাটুন"} type="number" value={item.cartons} onChange={e => updateItem(idx, 'cartons', parseInt(e.target.value))} />
                  </div>
                  <div className="col-span-2">
                    <Input label={type === 'return' ? "রিটার্ন পিস" : type === 'damage' ? "ড্যামেজ পিস" : "পিস"} type="number" value={item.pieces} onChange={e => updateItem(idx, 'pieces', parseInt(e.target.value))} />
                  </div>
                  <div className="col-span-2">
                    {type === 'issue' && (
                      <Button variant="danger" className="w-full" onClick={() => setSelectedItems(selectedItems.filter((_, i) => i !== idx))}>
                        <X size={16} />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
            {selectedItems.length === 0 && (
              <div className="text-center py-12 text-slate-400 border-2 border-dashed border-slate-100 rounded-2xl">
                {type === 'return' || type === 'damage' ? 'কোনো ইস্যু করা পণ্য পাওয়া যায়নি।' : 'কোনো আইটেম যোগ করা হয়নি। শুরু করতে "আইটেম যোগ করুন" বাটনে ক্লিক করুন।'}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-100 flex justify-between items-center">
            {type === 'issue' && canEdit ? (
              <Button 
                variant="outline" 
                onClick={addItem} 
                className="border-indigo-200 text-indigo-600 hover:bg-indigo-50"
                disabled={selectedItems.length >= products.length}
              >
                <Plus size={16} /> আইটেম যোগ করুন
              </Button>
            ) : <div />}
            {canEdit && (
              <Button className={cn("px-8", type === 'issue' ? 'bg-blue-600 hover:bg-blue-700' : type === 'return' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700')} onClick={handleSave} disabled={selectedItems.length === 0}>
                {typeLabels[type]} নিশ্চিত করুন
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

const Settings = ({ settings, onRefresh }: { settings: Settings, onRefresh: () => void }) => {
  const [form, setForm] = useState(settings);

  const handleSave = async () => {
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form)
    });
    onRefresh();
    alert('সেটিংস সফলভাবে আপডেট করা হয়েছে!');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900">ব্যবসা সেটিংস</h1>
      <Card className="p-8 space-y-6 border-indigo-100 shadow-2xl">
        <div className="flex flex-col items-center gap-4 mb-6">
          <div className="w-32 h-32 bg-slate-50 rounded-3xl flex items-center justify-center border-2 border-dashed border-indigo-200 overflow-hidden shadow-inner">
            {form.logo_url ? (
              <img src={form.logo_url} alt="Logo" className="w-full h-full object-contain" />
            ) : (
              <div className="text-indigo-300 flex flex-col items-center">
                <Plus size={32} />
                <span className="text-xs font-bold mt-1">লোগো</span>
              </div>
            )}
          </div>
          <Button variant="outline" size="sm" className="border-indigo-200 text-indigo-600">লোগো পরিবর্তন করুন</Button>
        </div>

        <Input label="প্রতিষ্ঠানের নাম" value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} />
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-slate-700">প্রতিষ্ঠানের ঠিকানা</label>
          <textarea 
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all h-32"
            value={form.address}
            onChange={e => setForm({...form, address: e.target.value})}
          />
        </div>
        <Input label="লোগো ইউআরএল (URL)" placeholder="https://..." value={form.logo_url} onChange={e => setForm({...form, logo_url: e.target.value})} />
        
        <div className="pt-4">
          <Button className="w-full py-4 text-lg" onClick={handleSave}>সেটিংস সংরক্ষণ করুন</Button>
        </div>
      </Card>
    </div>
  );
};

const Reports = ({ settings, masters }: { settings: Settings, masters: MasterData }) => {
  const [filters, setFilters] = useState({
    date: new Date().toISOString().split('T')[0],
    delivery_boy_id: '',
    sr_id: '',
    route_id: '',
    van_id: ''
  });
  const [report, setReport] = useState<any[]>([]);

  const fetchReport = async () => {
    const url = new URL(`/api/reports/invoice/${filters.date}`, window.location.origin);
    if (filters.delivery_boy_id) url.searchParams.append('delivery_boy_id', filters.delivery_boy_id);
    const res = await fetch(url.toString());
    setReport(await res.json());
  };

  useEffect(() => {
    fetchReport();
  }, [filters.date, filters.delivery_boy_id]);

  useEffect(() => {
    if (filters.date && filters.delivery_boy_id) {
      fetch(`/api/issued-items/${filters.date}/${filters.delivery_boy_id}`)
        .then(res => res.json())
        .then(data => {
          if (data.metadata) {
            setFilters(prev => ({
              ...prev,
              sr_id: data.metadata.sr_id.toString(),
              route_id: data.metadata.route_id.toString(),
              van_id: data.metadata.van_id.toString()
            }));
          }
        });
    } else {
      setFilters(prev => ({
        ...prev,
        sr_id: '',
        route_id: '',
        van_id: ''
      }));
    }
  }, [filters.date, filters.delivery_boy_id]);

  const totalAmount = report.reduce((acc, item) => {
    const salesCartons = item.issued_cartons - item.returned_cartons - item.damaged_cartons;
    const salesPieces = item.issued_pieces - item.returned_pieces - item.damaged_pieces;
    return acc + (salesCartons * item.unit_price * item.pieces_per_carton) + (salesPieces * item.unit_price);
  }, 0);

  const exportPDF = () => {
    const element = document.getElementById('invoice-report');
    if (!element) return;
    
    const opt = {
      margin: 0.5,
      filename: `Report_${filters.date}_${filters.delivery_boy_id || 'All'}.pdf`,
      image: { type: 'jpeg' as const, quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in' as const, format: 'letter' as const, orientation: 'portrait' as const }
    };

    html2pdf().from(element).set(opt).save();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <h1 className="text-2xl font-bold text-slate-900">দৈনিক বিক্রয় রিপোর্ট</h1>
      </div>

      <Card className="p-6 border-slate-100 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <Input 
            label="তারিখ" 
            type="date" 
            value={filters.date} 
            onChange={e => setFilters({...filters, date: e.target.value})} 
          />
          <Select 
            label="ডেলিভারি বয়" 
            options={masters.delivery_boys.map(d => ({ value: d.id, label: d.name }))} 
            value={filters.delivery_boy_id} 
            onChange={e => setFilters({...filters, delivery_boy_id: e.target.value})} 
          />
          <Select 
            label="এসআর-এর নাম" 
            options={masters.srs.map(s => ({ value: s.id, label: s.name }))} 
            value={filters.sr_id} 
            onChange={e => setFilters({...filters, sr_id: e.target.value})} 
            disabled={!!filters.delivery_boy_id}
          />
          <Select 
            label="রুট" 
            options={masters.routes.map(r => ({ value: r.id, label: r.name }))} 
            value={filters.route_id} 
            onChange={e => setFilters({...filters, route_id: e.target.value})} 
            disabled={!!filters.delivery_boy_id}
          />
          <Select 
            label="ভ্যান নং" 
            options={masters.vans.map(v => ({ value: v.id, label: v.van_no }))} 
            value={filters.van_id} 
            onChange={e => setFilters({...filters, van_id: e.target.value})} 
            disabled={!!filters.delivery_boy_id}
          />
        </div>
      </Card>

      <Card id="invoice-report" className="border-indigo-100 shadow-xl print:shadow-none print:border-none print:m-0 print:p-0">
        <div className="p-8 border-b border-indigo-50 flex justify-between items-start bg-gradient-to-r from-indigo-50/50 to-transparent print:bg-none print:border-slate-200">
          <div>
            <h2 className="text-3xl font-bold text-indigo-600 tracking-tight print:text-slate-900">{settings.company_name}</h2>
            <p className="text-slate-500 max-w-xs mt-2 font-medium print:text-slate-700">{settings.address}</p>
          </div>
          <div className="text-right">
            <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1 print:text-slate-500">তারিখ</div>
            <div className="text-lg font-bold text-slate-900">{format(new Date(filters.date), 'MMMM dd, yyyy')}</div>
            {filters.delivery_boy_id && (
              <div className="mt-2">
                <div className="text-xs font-bold uppercase tracking-widest text-indigo-400 mb-1 print:text-slate-500">ডেলিভারি বয়</div>
                <div className="text-sm font-bold text-slate-700">{masters.delivery_boys.find(d => d.id.toString() === filters.delivery_boy_id.toString())?.name}</div>
              </div>
            )}
          </div>
        </div>

        {filters.delivery_boy_id && (
          <div className="px-8 py-4 bg-slate-50 border-b border-slate-100 grid grid-cols-3 gap-4 print:bg-white print:border-slate-200">
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">এসআর:</span>
              <span className="ml-2 font-bold text-slate-700">{masters.srs.find(s => s.id.toString() === filters.sr_id.toString())?.name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">রুট:</span>
              <span className="ml-2 font-bold text-slate-700">{masters.routes.find(r => r.id.toString() === filters.route_id.toString())?.name || 'N/A'}</span>
            </div>
            <div>
              <span className="text-xs font-bold text-slate-400 uppercase">ভ্যান:</span>
              <span className="ml-2 font-bold text-slate-700">{masters.vans.find(v => v.id.toString() === filters.van_id.toString())?.van_no || 'N/A'}</span>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-y border-slate-100 print:bg-slate-100 print:border-slate-300">
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 print:text-slate-900">ক্রমিক</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 print:text-slate-900">পণ্যের নাম</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center print:text-slate-900">ইস্যু (কা/পি)</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center print:text-slate-900">রিটার্ন (কা/পি)</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-center print:text-slate-900">ড্যামেজ (কা/পি)</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right print:text-slate-900">মূল্য</th>
                <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right print:text-slate-900">মোট বিক্রয়</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 print:divide-slate-300">
              {report.map((item, idx) => {
                const salesCartons = item.issued_cartons - item.returned_cartons - item.damaged_cartons;
                const salesPieces = item.issued_pieces - item.returned_pieces - item.damaged_pieces;
                const totalSales = (salesCartons * item.unit_price * item.pieces_per_carton) + (salesPieces * item.unit_price);

                return (
                  <tr key={idx} className="hover:bg-indigo-50/30 transition-colors print:hover:bg-transparent">
                    <td className="px-6 py-4 text-slate-400 font-mono print:text-slate-700">{idx + 1}</td>
                    <td className="px-6 py-4 font-bold text-slate-900">{item.name}</td>
                    <td className="px-6 py-4 text-center text-sm font-medium">
                      {item.issued_cartons}কা / {item.issued_pieces}পি
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-amber-600 font-medium print:text-slate-700">
                      {item.returned_cartons}কা / {item.returned_pieces}পি
                    </td>
                    <td className="px-6 py-4 text-center text-sm text-red-500 font-medium print:text-slate-700">
                      {item.damaged_cartons}কা / {item.damaged_pieces}পি
                    </td>
                    <td className="px-6 py-4 text-right font-medium text-slate-600">৳{item.unit_price}</td>
                    <td className="px-6 py-4 text-right font-bold text-indigo-600 print:text-slate-900">
                      ৳{totalSales.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
              {report.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 italic">এই তারিখে কোনো অপারেশন পাওয়া যায়নি।</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        <div className="p-8 bg-slate-50/50 flex justify-end print:bg-white print:border-t print:border-slate-300">
          <div className="w-72 space-y-3">
            <div className="flex justify-between text-slate-500 font-medium print:text-slate-700">
              <span>উপ-মোট</span>
              <span>৳{totalAmount.toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-black text-2xl text-indigo-700 pt-3 border-t-2 border-indigo-100 print:text-slate-900 print:border-slate-900">
              <span>সর্বমোট</span>
              <span>৳{totalAmount.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </Card>
      
      <div className="flex justify-end gap-3 print:hidden">
        <Button variant="outline" onClick={exportPDF} className="bg-white shadow-sm border-slate-200 text-indigo-600">
          <FileText size={18} /> পিডিএফ এক্সপোর্ট
        </Button>
        <Button variant="outline" onClick={() => window.print()} className="bg-white shadow-sm border-slate-200">
          <FileText size={18} /> ইনভয়েস প্রিন্ট করুন
        </Button>
      </div>
    </div>
  );
};

const OperationUpdate = ({ masters }: { masters: MasterData }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [deliveryBoyId, setDeliveryBoyId] = useState('');
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    if (!date || !deliveryBoyId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/operations/combined/${date}/${deliveryBoyId}`);
      setItems(await res.json());
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      const res = await fetch('/api/operations/combined', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ date, delivery_boy_id: deliveryBoyId, items })
      });
      const result = await res.json();
      if (result.success) {
        alert('অপারেশন সফলভাবে আপডেট করা হয়েছে');
        fetchData();
      }
    } catch (err) {
      console.error(err);
      alert('আপডেট করতে সমস্যা হয়েছে');
    }
  };

  const updateItem = (productId: number, field: string, value: number) => {
    setItems(prev => prev.map(item => 
      item.product_id === productId ? { ...item, [field]: value } : item
    ));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">অপারেশন আপডেট (Admin Only)</h1>
      </div>

      <Card className="p-6 border-indigo-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input label="তারিখ" type="date" value={date} onChange={e => setDate(e.target.value)} />
          <Select 
            label="ডেলিভারি বয়" 
            options={masters.delivery_boys.map(db => ({ value: db.id.toString(), label: db.name }))} 
            value={deliveryBoyId} 
            onChange={e => setDeliveryBoyId(e.target.value)} 
          />
          <div className="flex items-end">
            <Button onClick={fetchData} className="w-full h-[46px]">তথ্য খুঁজুন</Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex justify-center py-12">লোড হচ্ছে...</div>
      ) : items.length > 0 ? (
        <Card className="border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500">পণ্যের নাম</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-center">ইস্যু (কাটুন/পিস)</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-center">রিটার্ন (কাটুন/পিস)</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase text-slate-500 text-center">ড্যামেজ (কাটুন/পিস)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map(item => (
                  <tr key={item.product_id} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4 font-medium">{item.product_name}</td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <input 
                          type="number" 
                          className="w-16 px-2 py-1 border rounded text-center" 
                          value={item.issue_cartons} 
                          onChange={e => updateItem(item.product_id, 'issue_cartons', parseInt(e.target.value) || 0)}
                        />
                        <input 
                          type="number" 
                          className="w-16 px-2 py-1 border rounded text-center" 
                          value={item.issue_pieces} 
                          onChange={e => updateItem(item.product_id, 'issue_pieces', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <input 
                          type="number" 
                          className="w-16 px-2 py-1 border rounded text-center" 
                          value={item.return_cartons} 
                          onChange={e => updateItem(item.product_id, 'return_cartons', parseInt(e.target.value) || 0)}
                        />
                        <input 
                          type="number" 
                          className="w-16 px-2 py-1 border rounded text-center" 
                          value={item.return_pieces} 
                          onChange={e => updateItem(item.product_id, 'return_pieces', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2 justify-center">
                        <input 
                          type="number" 
                          className="w-16 px-2 py-1 border rounded text-center" 
                          value={item.damage_cartons} 
                          onChange={e => updateItem(item.product_id, 'damage_cartons', parseInt(e.target.value) || 0)}
                        />
                        <input 
                          type="number" 
                          className="w-16 px-2 py-1 border rounded text-center" 
                          value={item.damage_pieces} 
                          onChange={e => updateItem(item.product_id, 'damage_pieces', parseInt(e.target.value) || 0)}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-6 bg-slate-50 flex justify-end">
            <Button onClick={handleUpdate} className="bg-indigo-600 hover:bg-indigo-700">পরিবর্তন সংরক্ষণ করুন</Button>
          </div>
        </Card>
      ) : date && deliveryBoyId && !loading && (
        <div className="text-center py-12 text-slate-400 italic">কোনো তথ্য পাওয়া যায়নি।</div>
      )}
    </div>
  );
};

const Expenses = ({ role }: { role?: string }) => {
  const canEdit = role !== 'staff';
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newExpense, setNewExpense] = useState({ category: '', amount: 0, description: '', date: new Date().toISOString().split('T')[0] });

  const fetchExpenses = async () => {
    const res = await fetch('/api/expenses');
    setExpenses(await res.json());
  };

  useEffect(() => { fetchExpenses(); }, []);

  const handleAdd = async () => {
    await fetch('/api/expenses', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newExpense)
    });
    setShowAdd(false);
    fetchExpenses();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">ব্যয় ট্র্যাকিং</h1>
        {canEdit && (
          <Button onClick={() => setShowAdd(true)} className="bg-rose-600 hover:bg-rose-700">
            <Plus size={18} /> নতুন ব্যয় যোগ করুন
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card className="p-6 col-span-1 h-fit border-rose-100 shadow-lg shadow-rose-50">
          <h3 className="font-bold mb-4 text-rose-900">সারসংক্ষেপ</h3>
          <div className="space-y-4">
            <div>
              <div className="text-xs text-slate-400 uppercase font-bold">এই মাসে</div>
              <div className="text-2xl font-bold text-rose-600">৳{expenses.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}</div>
            </div>
            <div className="pt-4 border-t border-slate-100">
              <div className="text-xs text-slate-400 uppercase font-bold">ক্যাটাগরি</div>
              <div className="mt-2 space-y-2">
                {['ব্যক্তিগত', 'রক্ষণাবেক্ষণ', 'বেতন', 'ভাড়া', 'অফিস খরচ', 'আপ্যায়ন'].map(cat => (
                  <div key={cat} className="flex justify-between text-sm">
                    <span className="text-slate-600">{cat}</span>
                    <span className="font-bold">৳{expenses.filter(e => e.category === cat).reduce((acc, curr) => acc + curr.amount, 0).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-3 border-slate-100">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-bottom border-slate-200">
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">তারিখ</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">ক্যাটাগরি</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500">বিবরণ</th>
                  <th className="px-6 py-4 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">পরিমাণ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {expenses.map(e => (
                  <tr key={e.id} className="hover:bg-rose-50/30 transition-colors">
                    <td className="px-6 py-4 text-slate-600">{format(new Date(e.date), 'MMM dd, yyyy')}</td>
                    <td className="px-6 py-4">
                      <span className="px-2 py-1 bg-rose-50 text-rose-600 rounded-md text-xs font-bold border border-rose-100">{e.category}</span>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{e.description}</td>
                    <td className="px-6 py-4 text-right font-bold text-rose-600">৳{e.amount.toLocaleString()}</td>
                  </tr>
                ))}
                {expenses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-slate-400 italic">এখনো কোনো ব্যয় রেকর্ড করা হয়নি।</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>

      <AnimatePresence>
        {showAdd && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-xl font-bold">নতুন ব্যয় যোগ করুন</h3>
                <button onClick={() => setShowAdd(false)} className="p-2 hover:bg-slate-100 rounded-lg transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <Input label="তারিখ" type="date" value={newExpense.date} onChange={e => setNewExpense({...newExpense, date: e.target.value})} />
                <Select 
                  label="ক্যাটাগরি" 
                  options={[
                    { value: 'ব্যক্তিগত', label: 'ব্যক্তিগত' },
                    { value: 'রক্ষণাবেক্ষণ', label: 'রক্ষণাবেক্ষণ' },
                    { value: 'বেতন', label: 'বেতন' },
                    { value: 'ভাড়া', label: 'ভাড়া' },
                    { value: 'অফিস খরচ', label: 'অফিস খরচ' },
                    { value: 'আপ্যায়ন', label: 'আপ্যায়ন' },
                    { value: 'অন্যান্য', label: 'অন্যান্য' }
                  ]} 
                  value={newExpense.category} 
                  onChange={e => setNewExpense({...newExpense, category: e.target.value})} 
                />
                <Input label="পরিমাণ (৳)" type="number" value={newExpense.amount} onChange={e => setNewExpense({...newExpense, amount: parseFloat(e.target.value)})} />
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-slate-700">বিবরণ</label>
                  <textarea 
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all h-24"
                    value={newExpense.description}
                    onChange={e => setNewExpense({...newExpense, description: e.target.value})}
                  />
                </div>
              </div>
              <div className="p-6 bg-slate-50 flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => setShowAdd(false)}>বাতিল</Button>
                <Button className="flex-1 bg-rose-600 hover:bg-rose-700" onClick={handleAdd}>সংরক্ষণ করুন</Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [settings, setSettings] = useState<Settings>({ company_name: 'DealerFlow', address: '', logo_url: '' });
  const [masters, setMasters] = useState<MasterData>({ routes: [], srs: [], delivery_boys: [], vans: [] });
  const [stats, setStats] = useState({ todaySales: 0, totalDues: 0, lowStockCount: 0 });

  const fetchData = async () => {
    const [pRes, sRes, mRes, stRes] = await Promise.all([
      fetch('/api/products'),
      fetch('/api/settings'),
      fetch('/api/masters'),
      fetch('/api/dashboard/stats')
    ]);
    setProducts(await pRes.json());
    setSettings(await sRes.json());
    setMasters(await mRes.json());
    setStats(await stRes.json());
  };

  useEffect(() => {
    fetchData();
  }, []);

  const navItems = [
    { id: 'dashboard', label: 'ড্যাশবোর্ড', icon: LayoutDashboard },
    { id: 'inventory', label: 'ইনভেন্টরি', icon: Package },
    { id: 'operations', label: 'অপারেশন', icon: Truck },
    { id: 'op_update', label: 'অপঃ আপডেট', icon: RotateCcw, adminOnly: true },
    { id: 'reports', label: 'রিপোর্ট', icon: FileText },
    { id: 'dues', label: 'বাকি (Baki)', icon: Wallet },
    { id: 'expenses', label: 'ব্যয়', icon: TrendingUp },
    { id: 'profit', label: 'প্রফিট', icon: Coins, adminOnly: true },
    { id: 'masters', label: 'মাস্টার ডাটা', icon: ChevronRight },
    { id: 'users', label: 'ইউজার', icon: Users, adminOnly: true },
    { id: 'settings', label: 'সেটিংস', icon: SettingsIcon, adminOnly: true },
  ].filter(item => !item.adminOnly || user?.role === 'admin');

  if (!user) {
    return <Login onLogin={setUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      {/* Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 bg-white border-r border-slate-200 z-40 transition-all duration-300 shadow-2xl shadow-slate-200",
        sidebarOpen ? "w-64" : "w-20"
      )}>
        <div className="h-full flex flex-col">
          <div className="p-6 flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-200">D</div>
            {sidebarOpen && <span className="font-black text-2xl tracking-tight bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">{settings.company_name}</span>}
          </div>

          <nav className="flex-1 px-3 space-y-1 mt-4 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
            {navItems.map(item => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl transition-all group relative overflow-hidden",
                  activeTab === item.id 
                    ? "bg-indigo-600 text-white shadow-xl shadow-indigo-100" 
                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                )}
              >
                <item.icon size={22} className={cn(
                  "transition-colors relative z-10",
                  activeTab === item.id ? "text-white" : "text-slate-400 group-hover:text-slate-600"
                )} />
                {sidebarOpen && <span className="font-bold relative z-10">{item.label}</span>}
                {activeTab === item.id && (
                  <motion.div layoutId="nav-bg" className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-purple-600" />
                )}
              </button>
            ))}
          </nav>

          <div className="p-4 border-t border-slate-100">
            <button 
              onClick={() => setUser(null)}
              className="w-full flex items-center gap-3 px-4 py-3.5 text-slate-500 hover:text-red-600 transition-colors font-bold"
            >
              <LogOut size={22} />
              {sidebarOpen && <span>লগআউট</span>}
            </button>
            {sidebarOpen && (
              <div className="mt-2 text-[10px] text-center text-slate-400 font-medium">
                Powered by Mahfuzur
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className={cn(
        "flex-1 transition-all duration-300 min-h-screen",
        sidebarOpen ? "pl-64" : "pl-20"
      )}>
        {/* Header */}
        <header className="h-20 bg-white/80 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2.5 hover:bg-slate-100 rounded-xl transition-colors text-slate-500">
              <Menu size={24} />
            </button>
          </div>

          <div className="flex items-center gap-8">
            <button 
              onClick={() => setShowChangePassword(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-slate-500 hover:bg-slate-100 hover:text-indigo-600 transition-all font-bold text-sm"
            >
              <Lock size={18} />
              <span>পাসওয়ার্ড পরিবর্তন</span>
            </button>
            <div className="flex items-center gap-4 pl-8 border-l border-slate-200">
              <div className="text-right">
                <div className="text-sm font-black text-slate-900">{user.full_name}</div>
                <div className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">{user.role}</div>
              </div>
              <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-2xl flex items-center justify-center font-black text-slate-600 shadow-inner border border-white">
                {user.username.substring(0, 2).toUpperCase()}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="p-10 max-w-7xl mx-auto">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' && <Dashboard stats={stats} />}
              {activeTab === 'inventory' && <Inventory products={products} onRefresh={fetchData} role={user.role} />}
              {activeTab === 'operations' && <Operations products={products} masters={masters} onRefresh={fetchData} role={user.role} />}
              {activeTab === 'op_update' && user.role === 'admin' && <OperationUpdate masters={masters} />}
              {activeTab === 'reports' && <Reports settings={settings} masters={masters} />}
              {activeTab === 'expenses' && <Expenses role={user.role} />}
              {activeTab === 'dues' && <Dues role={user.role} />}
              {activeTab === 'profit' && user.role === 'admin' && <Profit />}
              {activeTab === 'users' && user.role === 'admin' && <UserManagement />}
              {activeTab === 'masters' && <MasterDataManagement masters={masters} onRefresh={fetchData} role={user.role} />}
              {activeTab === 'settings' && user.role === 'admin' && <Settings settings={settings} onRefresh={fetchData} />}
            </motion.div>
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {showChangePassword && user && (
            <ChangePasswordModal user={user} onClose={() => setShowChangePassword(false)} />
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
