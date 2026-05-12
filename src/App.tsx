import React, { useState, useEffect, createContext, useContext } from 'react';
import { 
  auth, 
  db, 
  googleProvider, 
  signInWithPopup, 
  signOut, 
  onAuthStateChanged,
  collection,
  query,
  where,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  setDoc
} from './firebase';
import { 
  Plus, 
  ExternalLink, 
  Trash2, 
  Edit2, 
  LogOut, 
  LayoutGrid, 
  Search,
  Globe,
  Wifi,
  WifiOff,
  User as UserIcon,
  X,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from './lib/utils';

// --- Types ---

interface System {
  id: string;
  name: string;
  url: string;
  ownerId: string;
  createdAt: any;
  updatedAt: any;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoURL: string;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// --- Components ---

const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const profile: UserProfile = {
          uid: firebaseUser.uid,
          email: firebaseUser.email || '',
          displayName: firebaseUser.displayName || 'Usuário',
          photoURL: firebaseUser.photoURL || '',
        };
        setUser(profile);
        
        // Sync user profile to Firestore
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), profile, { merge: true });
        } catch (error) {
          console.error("Error syncing user profile:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Login failed:", error);
    }
  };

  const logout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};

const SystemCard = ({ 
  system, 
  onEdit, 
  onDelete 
}: { 
  system: System; 
  onEdit: (s: System) => void; 
  onDelete: (id: string) => void;
  key?: string;
}) => {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      whileHover={{ y: -4 }}
      className="group relative bg-white dark:bg-blue-900/40 border border-blue-100 dark:border-blue-800 rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="p-3 bg-blue-50 dark:bg-blue-800/50 rounded-xl text-blue-600 dark:text-yellow-400 group-hover:bg-blue-600 group-hover:text-white dark:group-hover:bg-yellow-400 dark:group-hover:text-blue-950 transition-colors">
          <Globe className="w-6 h-6" />
        </div>
        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button 
            onClick={() => onEdit(system)}
            className="p-2 hover:bg-blue-50 dark:hover:bg-blue-800 rounded-lg text-blue-500 transition-colors"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          <button 
            onClick={() => onDelete(system.id)}
            className="p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg text-red-500 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-50 mb-1 truncate">
        {system.name}
      </h3>
      <p className="text-sm text-blue-500 dark:text-blue-300 mb-6 truncate font-mono">
        {system.url.replace(/^https?:\/\//, '')}
      </p>

      <a
        href={system.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 dark:text-yellow-400 hover:underline group/link"
      >
        Abrir Sistema
        <ExternalLink className="w-4 h-4 transition-transform group-hover/link:translate-x-0.5 group-hover/link:-translate-y-0.5" />
      </a>
    </motion.div>
  );
};

const SystemModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onSave: (data: { name: string; url: string }) => void;
  initialData?: System | null;
}) => {
  const [name, setName] = useState(initialData?.name || '');
  const [url, setUrl] = useState(initialData?.url || '');

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setUrl(initialData.url);
    } else {
      setName('');
      setUrl('');
    }
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-blue-950/50 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-blue-900 rounded-3xl p-8 w-full max-w-md shadow-2xl border border-blue-100 dark:border-blue-800"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-blue-900 dark:text-white">
            {initialData ? 'Editar Sistema' : 'Adicionar Novo Sistema'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-blue-50 dark:hover:bg-blue-800 rounded-full transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={(e) => {
          e.preventDefault();
          onSave({ name, url });
        }} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-blue-700 dark:text-blue-200 mb-1">Nome do Sistema</label>
            <input
              required
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Painel de Produção"
              className="w-full px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 focus:ring-2 focus:ring-blue-600 dark:focus:ring-yellow-400 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-blue-700 dark:text-blue-200 mb-1">URL</label>
            <input
              required
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://app.example.com"
              className="w-full px-4 py-3 rounded-xl border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950 focus:ring-2 focus:ring-blue-600 dark:focus:ring-yellow-400 outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            className="w-full py-4 bg-blue-600 dark:bg-yellow-400 text-white dark:text-blue-950 rounded-xl font-bold hover:opacity-90 transition-opacity mt-4 flex items-center justify-center gap-2"
          >
            <Check className="w-5 h-5" />
            {initialData ? 'Atualizar Sistema' : 'Salvar Sistema'}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

const Dashboard = () => {
  const { user, logout } = useAuth();
  const [systems, setSystems] = useState<System[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSystem, setEditingSystem] = useState<System | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'systems'),
      where('ownerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const systemsData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as System[];
      
      // Sort by creation date locally
      setSystems(systemsData.sort((a, b) => {
        const dateA = a.createdAt?.seconds || 0;
        const dateB = b.createdAt?.seconds || 0;
        return dateB - dateA;
      }));
    }, (error) => {
      console.error("Firestore error:", error);
    });

    return () => unsubscribe();
  }, [user]);

  const handleSave = async (data: { name: string; url: string }) => {
    if (!user) return;

    try {
      if (editingSystem) {
        await updateDoc(doc(db, 'systems', editingSystem.id), {
          ...data,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'systems'), {
          ...data,
          ownerId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
      setIsModalOpen(false);
      setEditingSystem(null);
    } catch (error) {
      console.error("Save failed:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja remover este sistema?')) return;
    try {
      await deleteDoc(doc(db, 'systems', id));
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  const filteredSystems = systems.filter(s => 
    s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s.url.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-blue-950 text-blue-900 dark:text-blue-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 dark:bg-blue-900/80 backdrop-blur-md border-b border-blue-100 dark:border-blue-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 dark:bg-yellow-400 rounded-xl flex items-center justify-center overflow-hidden">
              <img 
                src="/logo.png" 
                alt="Logo" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                  e.currentTarget.parentElement?.querySelector('svg')?.classList.remove('hidden');
                }}
              />
              <LayoutGrid className="w-6 h-6 text-white dark:text-blue-950 hidden" />
            </div>
            <h1 className="text-xl font-bold tracking-tight hidden sm:block">Rede Bantu</h1>
          </div>

          <div className="flex-1 max-w-md mx-8 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
              <input
                type="text"
                placeholder="Pesquisar sistemas..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 rounded-full bg-blue-50 dark:bg-blue-900 border-none focus:ring-2 focus:ring-blue-600 dark:focus:ring-yellow-400 transition-all"
              />
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className={cn(
              "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium",
              isOnline ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400" : "bg-blue-100 text-blue-700 dark:bg-blue-800 dark:text-blue-300"
            )}>
              {isOnline ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
              {isOnline ? 'Online' : 'Modo Offline'}
            </div>
            
            <div className="flex items-center gap-3 pl-4 border-l border-blue-200 dark:border-blue-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium leading-none">{user?.displayName}</p>
                <p className="text-xs text-blue-500 dark:text-blue-400 mt-1">{user?.email}</p>
              </div>
              <button 
                onClick={logout}
                className="p-2 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-full transition-colors"
                title="Sair"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12">
          <div>
            <h2 className="text-4xl font-black tracking-tight mb-2 text-blue-900 dark:text-white">Meus Sistemas</h2>
            <p className="text-blue-600 dark:text-blue-300">Gerencie e acesse todas as suas aplicações conectadas.</p>
          </div>
          <button
            onClick={() => {
              setEditingSystem(null);
              setIsModalOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 dark:bg-yellow-400 text-white dark:text-blue-950 rounded-2xl font-bold hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-blue-200 dark:shadow-none"
          >
            <Plus className="w-5 h-5" />
            Adicionar Sistema
          </button>
        </div>

        {/* Mobile Search */}
        <div className="md:hidden mb-8">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
            <input
              type="text"
              placeholder="Pesquisar sistemas..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white dark:bg-blue-900 border border-blue-200 dark:border-blue-800 focus:ring-2 focus:ring-blue-600 dark:focus:ring-yellow-400 transition-all"
            />
          </div>
        </div>

        <AnimatePresence mode="popLayout">
          {filteredSystems.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {filteredSystems.map((system) => (
                <SystemCard
                  key={system.id}
                  system={system}
                  onEdit={(s) => {
                    setEditingSystem(s);
                    setIsModalOpen(true);
                  }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center justify-center py-24 text-center border-2 border-dashed border-blue-200 dark:border-blue-800 rounded-3xl"
            >
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-2xl flex items-center justify-center mb-4">
                <Globe className="w-8 h-8 text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2">Nenhum sistema encontrado</h3>
              <p className="text-blue-500 dark:text-blue-300 max-w-xs">
                {searchQuery ? "Nenhum sistema corresponde à sua pesquisa." : "Comece adicionando seu primeiro sistema ao hub."}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <SystemModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingSystem(null);
        }}
        onSave={handleSave}
        initialData={editingSystem}
      />
    </div>
  );
};

const LandingPage = () => {
  const { login } = useAuth();

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-blue-950 flex flex-col items-center justify-center p-4 overflow-hidden relative">
      {/* Background Decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 dark:bg-blue-900/50 rounded-full blur-3xl" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-100 dark:bg-blue-900/50 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 text-center max-w-2xl px-4"
      >
        <div className="w-32 h-32 sm:w-48 sm:h-48 bg-blue-600 dark:bg-yellow-400 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 shadow-2xl overflow-hidden border-4 border-white dark:border-blue-900">
          <img 
            src="/logo.png" 
            alt="Rede Bantu Logo" 
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.querySelector('svg')?.classList.remove('hidden');
            }}
          />
          <LayoutGrid className="w-16 h-16 sm:w-24 sm:h-24 text-white dark:text-blue-950 hidden" />
        </div>
        
        <h1 className="text-6xl sm:text-7xl font-black tracking-tighter text-blue-900 dark:text-white mb-6">
          Rede Bantu
        </h1>
        <p className="text-xl text-blue-700 dark:text-blue-200 mb-12 leading-relaxed">
          O sistema nervoso central para sua infraestrutura digital. Gerencie, sincronize e acesse todas as suas aplicações de um painel seguro e pronto para uso offline.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={login}
            className="w-full sm:w-auto px-8 py-4 bg-blue-600 dark:bg-yellow-400 text-white dark:text-blue-950 rounded-2xl font-bold text-lg hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 shadow-xl"
          >
            <UserIcon className="w-5 h-5" />
            Começar com Google
          </button>
          <div className="flex items-center gap-4 text-sm font-medium text-blue-400 dark:text-blue-300">
            <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Multiusuário</span>
            <span className="flex items-center gap-1"><Check className="w-4 h-4" /> Offline</span>
          </div>
        </div>
      </motion.div>

      {/* Feature Preview */}
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-24 w-full max-w-5xl hidden lg:block"
      >
        <div className="bg-blue-100 dark:bg-blue-900 rounded-t-[3rem] p-8 pb-0 border-x border-t border-blue-200 dark:border-blue-800">
          <div className="bg-white dark:bg-blue-950 rounded-t-2xl h-64 shadow-inner flex items-center justify-center">
             <div className="grid grid-cols-3 gap-6 w-full max-w-3xl px-12">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-32 bg-blue-50 dark:bg-blue-900 rounded-2xl border border-blue-100 dark:border-blue-800 animate-pulse" />
                ))}
             </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

function AppContent() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-black">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-12 h-12 border-4 border-zinc-200 dark:border-zinc-800 border-t-zinc-900 dark:border-t-white rounded-full"
        />
      </div>
    );
  }

  return user ? <Dashboard /> : <LandingPage />;
}
