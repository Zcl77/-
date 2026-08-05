import React, { useState } from 'react';
import { Project, ProjectCategory, Review, WorkStep, RoomDetail, CraftsmanProfile, StudioSettings } from '../types';
import { PRESET_IMAGES } from '../data';
import { ImageEditContext } from '../App';
import { compressImage } from '../imageResizer';
import { 
  Plus, 
  Trash2, 
  Edit2, 
  Check, 
  Copy,
  ArrowRight, 
  User, 
  ExternalLink, 
  RefreshCw, 
  FolderOpen, 
  Calendar, 
  Mail,
  Image as ImageIcon,
  Sparkles,
  LayoutGrid,
  Eye,
  FileText,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Ruler,
  Box,
  Compass,
  CalendarDays,
  Users,
  Star,
  QrCode,
  Upload,
  X
} from 'lucide-react';

interface AdminDashboardProps {
  projects: Project[];
  reviews: Review[];
  categories: string[];
  hiddenCategories: string[];
  onUpdateProjects: (updated: Project[]) => void;
  onUpdateReviews: (updated: Review[]) => void;
  onUpdateCategories: (updated: string[]) => void;
  onUpdateHiddenCategories: (updated: string[]) => void;
  isAdmin?: boolean;
  onToggleAdminStatus?: (status: boolean) => void;
  studioSettings?: StudioSettings;
  onUpdateSettings?: (settings: StudioSettings) => void;
  craftsmenProfiles?: Record<string, CraftsmanProfile>;
  onUpdateCraftsmenProfiles?: (profiles: Record<string, CraftsmanProfile>) => void;
  activeEditContext?: ImageEditContext | null;
  setActiveEditContext?: (ctx: ImageEditContext | null) => void;
}

export default function AdminDashboard({
  projects,
  reviews,
  categories,
  hiddenCategories,
  onUpdateProjects,
  onUpdateReviews,
  onUpdateCategories,
  onUpdateHiddenCategories,
  isAdmin = false,
  onToggleAdminStatus,
  studioSettings,
  onUpdateSettings,
  craftsmenProfiles,
  onUpdateCraftsmenProfiles,
  activeEditContext,
  setActiveEditContext
}: AdminDashboardProps) {
  // Navigation tabs within admin
  const [adminTab, setAdminTab] = useState<'projects' | 'reviews' | 'categories' | 'settings'>('projects');

  // Admin authentication form states
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoginError('');
      const { signInWithPopup, GoogleAuthProvider } = await import('firebase/auth');
      const { auth } = await import('../firebase');
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      const result = await signInWithPopup(auth, provider);
      if (result.user.emailVerified) {
        if (onToggleAdminStatus) {
            onToggleAdminStatus(true);
        }
      } else {
        setLoginError('❌ 账号邮箱未验证。');
      }
    } catch (err: any) {
      setLoginError('❌ 登录失败或被取消。');
    }
  };

  // Helper check helper to highlight drag targets in admin settings
  const getIsSelectedField = (type: 'master-qr') => {
    return activeEditContext?.type === type;
  };

  // Project creation state
  const [showAddForm, setShowAddForm] = useState(false);
  const [title, setTitle] = useState('');
  const [scale, setScale] = useState('1:35');
  const [category, setCategory] = useState<string>('');

  // Set default category when categories list loads
  React.useEffect(() => {
    if (categories.length > 0 && !category) {
      setCategory(categories[0]);
    }
  }, [categories]);

  // Category editing state in config manager
  const [editingCategoryIndex, setEditingCategoryIndex] = useState<number | null>(null);
  const [editingCategoryName, setEditingCategoryName] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');

  const handleAddCategory = () => {
    const trimmed = newCategoryName.trim();
    if (!trimmed) return;
    if (categories.includes(trimmed)) {
      alert('分类名称已存在');
      return;
    }
    const updated = [...categories, trimmed];
    onUpdateCategories(updated);
    setNewCategoryName('');
  };

  const handleDeleteCategory = (catToDelete: string) => {
    const count = projects.filter(p => p.category === catToDelete).length;
    if (count > 0) {
      if (!confirm(`包含此分类的项目有 ${count} 个，删除它后这些项目分类将归入“未分类”，是否确认删除？`)) {
        return;
      }
      const updatedProjects = projects.map(p => p.category === catToDelete ? { ...p, category: '未分类' } : p);
      onUpdateProjects(updatedProjects);
    }
    const updatedCats = categories.filter(c => c !== catToDelete);
    onUpdateCategories(updatedCats);
  };

  const handleStartEditCategory = (idx: number, name: string) => {
    setEditingCategoryIndex(idx);
    setEditingCategoryName(name);
  };

  const handleSaveCategory = (idx: number) => {
    const oldName = categories[idx];
    const newName = editingCategoryName.trim();
    if (!newName) return;
    if (categories.includes(newName) && categories.indexOf(newName) !== idx) {
      alert('已冲突重名');
      return;
    }

    const updatedCats = [...categories];
    updatedCats[idx] = newName;
    onUpdateCategories(updatedCats);

    const updatedProjects = projects.map(p => p.category === oldName ? { ...p, category: newName } : p);
    onUpdateProjects(updatedProjects);

    setEditingCategoryIndex(null);
  };
  const [status, setStatus] = useState<'WIP' | 'Completed' | 'Sold'>('WIP');
  const [description, setDescription] = useState('');
  const [timeSpent, setTimeSpent] = useState(120);
  const [completionPercent, setCompletionPercent] = useState(40);
  const [coverUrl, setCoverUrl] = useState(PRESET_IMAGES[0].url);
  
  // Custom masterwork fields
  const [dimensions, setDimensions] = useState('');
  const [materials, setMaterials] = useState('');
  const [period, setPeriod] = useState('');
  const [inspiration, setInspiration] = useState('');
  const [authorsInput, setAuthorsInput] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [rooms, setRooms] = useState<RoomDetail[]>([]);

  // Custom WIP Steps builder
  const [steps, setSteps] = useState<{ name: string; status: 'DONE' | 'ACTIVE' | 'NEXT'; detail: string; image?: string; images?: string[] }[]>([
    { name: '阶段一. 结构件拼装与打磨', status: 'DONE', detail: '拼装模型板件，打磨素组拼装。', image: 'https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=800', images: ['https://images.unsplash.com/photo-1513519245088-0e12902e5a38?auto=format&fit=crop&q=80&w=800'] },
    { name: '阶段二. 表面涂装与风化', status: 'ACTIVE', detail: '上底漆着色，增加风化流痕与泥渍。', image: 'https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&q=80&w=800', images: ['https://images.unsplash.com/photo-1517430816045-df4b7de11d1d?auto=format&fit=crop&q=80&w=800'] },
    { name: '阶段三. 细节刻画与总装亮灯', status: 'NEXT', detail: '点涂金属防锈油，最终组装亮灯调试。', image: '', images: [] }
  ]);

  // Project editing target ID (null if creating)
  const [editingId, setEditingId] = useState<string | null>(null);

  // Active indices for preset pickers (helper fields for managing multiple images)
  const [focusedImageIndex, setFocusedImageIndex] = useState<number | null>(null);
  const [focusedRoomIndex, setFocusedRoomIndex] = useState<{ rIdx: number; iIdx: number } | null>(null);

  // Local edit selection for drag-and-drop & copy-paste within admin dashboard form
  const [localEditContext, setLocalEditContext] = useState<{
    type: 'cover' | 'angle' | 'room-cover' | 'room-image' | 'preset' | 'wip-process';
    index?: number;
    roomIndex?: number;
  } | null>(null);

  // Editable presets list, stored inside localStorage so they aren't lost on refresh/render
  const [presetImages, setPresetImages] = useState<{ url: string; label: string }[]>(() => {
    const saved = localStorage.getItem('MICRO_STUDIO_PRESETS');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return PRESET_IMAGES;
  });

  // Local drop & paste hooks inside AdminDashboard
  const updateLocalImageByContext = (dataUrl: string, context: {
    type: 'cover' | 'angle' | 'room-cover' | 'room-image' | 'preset' | 'wip-process';
    index?: number;
    roomIndex?: number;
  }) => {
    if (context.type === 'cover') {
      setCoverUrl(dataUrl);
    } else if (context.type === 'angle' && context.index !== undefined) {
      const copy = [...images];
      copy[context.index] = dataUrl;
      setImages(copy);
    } else if (context.type === 'room-cover' && context.roomIndex !== undefined) {
      updateRoomField(context.roomIndex, 'coverUrl', dataUrl);
    } else if (context.type === 'room-image' && context.roomIndex !== undefined && context.index !== undefined) {
      const copy = [...rooms];
      const subImgs = [...copy[context.roomIndex].images];
      subImgs[context.index] = dataUrl;
      updateRoomField(context.roomIndex, 'images', subImgs);
    } else if (context.type === 'preset' && context.index !== undefined) {
      const copy = [...presetImages];
      copy[context.index] = { ...copy[context.index], url: dataUrl };
      setPresetImages(copy);
      localStorage.setItem('MICRO_STUDIO_PRESETS', JSON.stringify(copy));
    } else if (context.type === 'wip-process' && context.index !== undefined) {
      const copy = [...steps];
      const existingImages = copy[context.index].images || [];
      copy[context.index] = { 
        ...copy[context.index], 
        image: dataUrl,
        images: existingImages.length > 0 ? [dataUrl, ...existingImages.slice(1)] : [dataUrl]
      };
      setSteps(copy);
    }
  };

  const processLocalImageFile = async (file: File, context: {
    type: 'cover' | 'angle' | 'room-cover' | 'room-image' | 'preset' | 'wip-process';
    index?: number;
    roomIndex?: number;
  }) => {
    if (!file || !file.type.startsWith('image/')) return;
    try {
      const dataUrl = await compressImage(file, 0.15);
      updateLocalImageByContext(dataUrl, context);
    } catch (e) {
      console.error('Failed to compress image:', e);
    }
  };

  React.useEffect(() => {
    if (!isAdmin || !localEditContext) return;

    const handleLocalPaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;
      
      const items = clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processLocalImageFile(file, localEditContext);
            break;
          }
        }
      }
    };

    const handleLocalDragOver = (e: DragEvent) => {
      e.preventDefault();
    };

    const handleLocalDrop = (e: DragEvent) => {
      const dataTransfer = e.dataTransfer;
      if (!dataTransfer) return;

      if (dataTransfer.files && dataTransfer.files.length > 0) {
        e.preventDefault();
        processLocalImageFile(dataTransfer.files[0], localEditContext);
      }
    };

    window.addEventListener('paste', handleLocalPaste);
    window.addEventListener('dragover', handleLocalDragOver);
    window.addEventListener('drop', handleLocalDrop);

    return () => {
      window.removeEventListener('paste', handleLocalPaste);
      window.removeEventListener('dragover', handleLocalDragOver);
      window.removeEventListener('drop', handleLocalDrop);
    };
  }, [isAdmin, localEditContext, images, rooms, presetImages, coverUrl, steps]);

  if (!isAdmin) {
    return (
      <div className="flex-1 min-h-screen p-4 md:p-8 flex items-center justify-center macro-gradient text-gf-wood font-sans">
        <div className="bg-gf-rice/90 border border-gf-sand p-8 rounded shadow-2xl max-w-sm w-full space-y-6 relative text-left">
          <div className="text-center space-y-2 border-b border-gf-tea/20 pb-5 select-none">
            <span className="w-12 h-12 bg-gf-wood text-gf-rice font-serif text-2xl flex items-center justify-center rounded-full mx-auto shadow">
              督
            </span>
            <h2 className="text-xl font-serif text-gf-wood font-bold mt-2">
              营造督造案管理台
            </h2>
            <p className="text-[9px] text-gf-tea/70 font-mono uppercase tracking-widest leading-none mt-1">
              Workstation Authenticator
            </p>
          </div>

          {loginError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-mono rounded leading-relaxed text-left animate-slide-up">
              {loginError}
            </div>
          )}

          <form onSubmit={handleLoginSubmit} className="space-y-4">
            <div className="text-[11px] leading-relaxed text-gf-tea/80 font-serif mb-4 text-center">
              访问督造案台需进行身份验证，请使用谷歌账号登入以获取最高权限。由于这是永久储存，不接受非授权访问。
            </div>
            
            <button
              type="submit"
              className="w-full py-2.5 bg-gf-wood hover:bg-stone-850 text-gf-rice hover:text-white font-serif font-semibold rounded cursor-pointer transition-colors shadow-md text-xs tracking-widest text-center uppercase"
            >
              Google 安全登录 Authenticate
            </button>
          </form>
        </div>
      </div>
    );
  }

  const statusTranslations: Record<string, string> = {
    'WIP': '制作中 (WIP)',
    'Completed': '已完成',
    'Sold': '已被收藏'
  };

  // Add Step to builder
  const addStepRow = () => {
    setSteps(prev => [...prev, { name: '阶段 0' + (prev.length + 1) + '. 自定义工序', status: 'NEXT', detail: '请在此输入该制作步骤的具体工艺细则。', image: '', images: [] }]);
  };

  // Remove Step from builder
  const removeStepRow = (idx: number) => {
    setSteps(prev => prev.filter((_, i) => i !== idx));
  };

  // Add Project image row
  const addImageRow = () => {
    setImages(prev => [...prev, PRESET_IMAGES[0].url]);
  };

  // Remove Project image row
  const removeImageRow = (idx: number) => {
    setImages(prev => prev.filter((_, i) => i !== idx));
  };

  // Update specific Project image URL
  const updateImageRow = (idx: number, url: string) => {
    const copy = [...images];
    copy[idx] = url;
    setImages(copy);
  };

  // Add Room builder row
  const addRoomRow = () => {
    const newRoom: RoomDetail = {
      id: `room-${Date.now()}`,
      name: '微缩细节小室 (New Room)',
      coverUrl: PRESET_IMAGES[1].url,
      images: [PRESET_IMAGES[1].url],
      description: '在此录入生动的室景细节解说描述...',
      detailsList: ['手工精修微型器皿', '温暖环绕软光LED模块']
    };
    setRooms(prev => [...prev, newRoom]);
  };

  // Delete Room
  const deleteRoomRow = (idx: number) => {
    setRooms(prev => prev.filter((_, i) => i !== idx));
  };

  // Update specific field of a room
  const updateRoomField = (idx: number, field: keyof RoomDetail, value: any) => {
    const copy = [...rooms];
    copy[idx] = {
      ...copy[idx],
      [field]: value
    };
    setRooms(copy);
  };

  // Handle Project Form Submission
  const handleProjectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    const buildSteps: WorkStep[] = steps.map((s, idx) => ({
      id: `${Date.now()}-s-${idx}`,
      name: s.name,
      status: s.status,
      detail: s.detail,
      image: s.image,
      images: s.images || (s.image ? [s.image] : [])
    }));

    // Author string parsing
    const authorArr = authorsInput
      .split(/[,，]/)
      .map(x => x.trim())
      .filter(Boolean);

    // Save images list
    const finalCover = coverUrl.trim();
    const finalImages = images.filter(x => x.trim() !== "");
    const imagesToSave = finalImages.length > 0 ? finalImages : [finalCover];

    if (editingId) {
      // Edit mode
      const updated = projects.map(p => {
        if (p.id === editingId) {
          return {
            ...p,
            title,
            scale,
            category,
            status,
            description,
            timeSpent: Number(timeSpent),
            completionPercent: Number(completionPercent),
            coverUrl: finalCover,
            dimensions: dimensions.trim() || undefined,
            materials: materials.trim() || undefined,
            period: period.trim() || undefined,
            inspiration: inspiration.trim() || undefined,
            authors: authorArr.length > 0 ? authorArr : undefined,
            images: imagesToSave,
            rooms: rooms.length > 0 ? rooms : undefined,
            worksteps: buildSteps
          };
        }
        return p;
      });
      onUpdateProjects(updated);
      setEditingId(null);
    } else {
      // Add mode
      const newProj: Project = {
        id: title.toLowerCase().replace(/\s+/g, '-'),
        title,
        scale,
        category,
        status,
        description,
        timeSpent: Number(timeSpent),
        createdAt: new Date().toISOString(),
        completionPercent: Number(completionPercent),
        coverUrl: finalCover,
        dimensions: dimensions.trim() || undefined,
        materials: materials.trim() || undefined,
        period: period.trim() || undefined,
        inspiration: inspiration.trim() || undefined,
        authors: authorArr.length > 0 ? authorArr : undefined,
        images: imagesToSave,
        rooms: rooms.length > 0 ? rooms : undefined,
        worksteps: buildSteps
      };
      onUpdateProjects([newProj, ...projects]);
    }

    // Reset Form
    resetProjectForm();
  };

  const resetProjectForm = () => {
    setTitle('');
    setScale('1:35');
    setCategory(categories[0] || '场景还原');
    setStatus('WIP');
    setDescription('');
    setTimeSpent(120);
    setCompletionPercent(40);
    setCoverUrl(PRESET_IMAGES[0].url);
    setDimensions('');
    setMaterials('');
    setPeriod('');
    setInspiration('');
    setAuthorsInput('');
    setImages([]);
    setRooms([]);
    setSteps([
      { name: '阶段一. 素组拼装与打磨', status: 'DONE', detail: '拼装模型板件，打磨素组拼装。' },
      { name: '阶段二. 表面涂装与风化', status: 'ACTIVE', detail: '上底漆着色，增加风化流痕与泥渍。' },
      { name: '阶段三. 细节刻画与总装亮灯', status: 'NEXT', detail: '点涂金属防锈油，最终组装亮灯调试。' }
    ]);
    setShowAddForm(false);
    setEditingId(null);
    setFocusedImageIndex(null);
    setFocusedRoomIndex(null);
  };

  // Launch edit project mode
  const startEditProject = (proj: Project) => {
    setEditingId(proj.id);
    setTitle(proj.title);
    setScale(proj.scale);
    setCategory(proj.category);
    setStatus(proj.status);
    setDescription(proj.description);
    setTimeSpent(proj.timeSpent);
    setCompletionPercent(proj.completionPercent);
    setCoverUrl(proj.coverUrl);
    setDimensions(proj.dimensions || '');
    setMaterials(proj.materials || '');
    setPeriod(proj.period || '');
    setInspiration(proj.inspiration || '');
    setAuthorsInput(proj.authors ? proj.authors.join(', ') : '');
    setImages(proj.images || [proj.coverUrl]);
    setRooms(proj.rooms || []);
    
    if (proj.worksteps && proj.worksteps.length > 0) {
      setSteps(proj.worksteps.map(s => ({
        name: s.name,
        status: s.status,
        detail: s.detail || '',
        image: s.image || '',
        images: s.images || (s.image ? [s.image] : [])
      })));
    } else {
      setSteps([]);
    }
    setShowAddForm(true);
    setFocusedImageIndex(null);
    setFocusedRoomIndex(null);
  };

  // Delete Project
  const deleteProject = (id: string) => {
    if (confirm('阁下是否确定要永久删除此微缩模型的档案与历程数据？该操作不可撤销。')) {
      onUpdateProjects(projects.filter(p => p.id !== id));
    }
  };

  // Delete Review Comment
  const deleteReview = (revId: string) => {
    if (confirm('是否确定要永久从评鉴墙上删除这条实时观众评分与评论？')) {
      onUpdateReviews(reviews.filter(r => r.id !== revId));
    }
  };

  const renderLocalTargetOverlay = (
    type: 'cover' | 'angle' | 'room-cover' | 'room-image' | 'preset' | 'wip-process',
    index?: number,
    roomIndex?: number
  ) => {
    const isEditing = localEditContext?.type === type && 
                     (index === undefined || localEditContext?.index === index) && 
                     (roomIndex === undefined || localEditContext?.roomIndex === roomIndex);
    return (
      <div 
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          if (isEditing) {
            setLocalEditContext(null);
          } else {
            setLocalEditContext({ type, index, roomIndex });
          }
        }}
        className={`absolute inset-0 cursor-pointer flex flex-col items-center justify-center transition-all z-[150] ${
          isEditing 
            ? 'bg-amber-500/20 backdrop-blur-[1px]' 
            : 'bg-black/0 hover:bg-black/60 opacity-0 hover:opacity-100'
        }`}
      >
        <span className={`text-[8px] font-bold text-center px-1.5 py-0.5 rounded select-none shadow-md flex items-center gap-1 leading-none ${
          isEditing ? 'bg-amber-500 text-black font-semibold' : 'bg-black/90 text-white border border-white/10'
        }`} style={{ fontSize: '7.5px' }}>
          {isEditing ? (
            <>
              <span className="w-1.5 h-1.5 bg-black rounded-full animate-ping shrink-0" />
              锁定替换
            </>
          ) : (
            <>
              <Edit2 className="w-2.5 h-2.5 shrink-0" />
              点按改图
            </>
          )}
        </span>
      </div>
    );
  };

  return (
    <div className="flex-1 h-screen flex flex-col p-4 md:p-8 lg:p-12 macro-gradient overflow-y-auto">
      {/* Header */}
      <header className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline mb-10 border-b border-gf-tea/20 pb-6 gap-4">
        <div className="flex flex-col text-left">
          <h1 className="text-3xl md:text-4xl font-serif text-gf-wood tracking-tight leading-none text-left font-bold flex flex-wrap items-center gap-3">
            <span>工艺督造台</span>
            <span className="text-gf-tea/60 font-serif italic text-lg font-normal">Studio Bench</span>
            
            <button
              type="button"
              onClick={() => {
                if (onToggleAdminStatus) {
                  onToggleAdminStatus(false);
                }
              }}
              className="px-2 py-0.5 bg-red-100 hover:bg-red-200 text-red-700 hover:text-red-900 border border-red-300 text-[10px] font-sans font-bold uppercase tracking-wider rounded select-none cursor-pointer transition-colors"
              title="登出并恢复游客匿名浏览模式"
            >
              🚪 登出 Logout
            </button>
          </h1>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] mt-3 font-semibold text-gf-tea text-left">
            MICRO SYSTEM MANAGEMENT PORTAL / 营造案存底与访客评定审核 | 当前身份：高级营造官
          </p>
        </div>

        {/* Dashboard Core Navigation Tabs */}
        <div className="flex flex-wrap bg-white/50 p-1 border border-gf-tea/20 rounded font-mono text-xs max-w-xl self-start sm:self-auto select-none gap-1 shadow-xs">
          <button
            onClick={() => setAdminTab('projects')}
            className={`px-3.5 py-1.5 transition-colors rounded-sm cursor-pointer font-serif ${
              adminTab === 'projects' ? 'bg-gf-wood text-gf-rice font-bold' : 'text-gf-tea hover:text-gf-wood'
            }`}
          >
            项目营造档案 ({projects.length})
          </button>
          
          <button
            onClick={() => setAdminTab('reviews')}
            className={`px-3.5 py-1.5 transition-colors rounded-sm cursor-pointer font-serif ${
              adminTab === 'reviews' ? 'bg-gf-wood text-gf-rice font-bold' : 'text-gf-tea hover:text-gf-wood'
            }`}
          >
            实时评鉴审核 ({reviews.length})
          </button>

          <button
            onClick={() => setAdminTab('categories')}
            className={`px-3.5 py-1.5 transition-colors rounded-sm cursor-pointer font-serif ${
              adminTab === 'categories' ? 'bg-gf-wood text-gf-rice font-bold' : 'text-gf-tea hover:text-gf-wood'
            }`}
          >
            门类配置管理 ({categories.length})
          </button>

          <button
            onClick={() => setAdminTab('settings')}
            className={`px-3.5 py-1.5 transition-colors rounded-sm cursor-pointer font-serif ${
              adminTab === 'settings' ? 'bg-gf-wood text-gf-rice font-bold' : 'text-gf-tea hover:text-gf-wood'
            }`}
          >
            主理微印设定
          </button>
        </div>
      </header>

      {/* RENDER THE FORM TO ADD/EDIT WORK */}
      {showAddForm ? (
        <form onSubmit={handleProjectSubmit} className="max-w-5xl bg-white/90 border border-gf-tea/20 p-6 md:p-8 rounded space-y-6 mb-8 text-left shadow-md">
          <div className="flex justify-between items-center border-b border-gf-tea/15 pb-3">
            <h2 className="text-xl font-serif text-gf-wood select-none font-bold">
              {editingId ? '编辑模型方案与背景细则 Archetype' : '录入全新馆藏级微缩杰作 Masterpiece'}
            </h2>
            <button
              type="button"
              onClick={resetProjectForm}
              className="text-gf-tea hover:text-gf-wood text-xs font-mono uppercase tracking-wider bg-white px-2.5 py-1 border border-gf-tea/20 cursor-pointer rounded"
            >
              取消 Cancel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-gf-tea font-mono font-bold">
                作品名称 Model Project Title *
              </label>
              <input
                type="text"
                required
                placeholder="例如：极地死寂之境机动库"
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-white border border-gf-tea/35 p-3 text-sm text-gf-wood rounded focus:border-gf-wood focus:outline-none focus:ring-1 focus:ring-gf-wood/50 transition-all text-left"
              />
            </div>

            {/* Scale */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-gf-tea font-mono font-bold">
                  模型拼装比例 Scale *
                </label>
                <input
                  type="text"
                  required
                  placeholder="例如：1:35"
                  value={scale}
                  onChange={e => setScale(e.target.value)}
                  className="w-full bg-white border border-gf-tea/35 p-3 text-sm text-gf-wood rounded focus:border-gf-wood focus:outline-none focus:ring-1 focus:ring-gf-wood/50 transition-all text-left"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-widest text-[#A38A6C] font-mono font-bold">
                  艺术风格划分 Category *
                </label>
                <select
                  value={category}
                  onChange={e => setCategory(e.target.value)}
                  className="w-full bg-white text-stone-950 border border-gf-tea/35 p-3 text-sm rounded focus:ring-1 focus:ring-gf-wood focus:outline-none cursor-pointer font-sans hover:bg-amber-50 hover:border-gf-wood hover:text-stone-900 transition-all duration-200"
                >
                  {categories.map(cat => (
                    <option key={cat} value={cat} className="bg-white text-stone-950 font-sans">{cat}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#A38A6C] font-mono font-bold">
                研制与收藏状态 Status *
              </label>
              <select
                value={status}
                onChange={e => setStatus(e.target.value as any)}
                className="w-full bg-white text-stone-950 border border-gf-tea/35 p-3 text-sm rounded focus:ring-1 focus:ring-gf-wood focus:outline-none cursor-pointer font-sans hover:bg-amber-50 hover:border-gf-wood hover:text-stone-900 transition-all duration-200"
              >
                <option value="WIP" className="bg-white text-stone-950 font-sans">工艺装配/制作中 (WIP)</option>
                <option value="Completed" className="bg-white text-stone-950 font-sans">研制完成，陈列艺廊 (Completed)</option>
                <option value="Sold" className="bg-white text-stone-950 font-sans">已被私人藏家极高价收藏 (Sold)</option>
              </select>
            </div>

            {/* Time spent */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-[#A38A6C] font-mono font-bold">
                设计与制作累计排期工时 Spend *
              </label>
              <input
                type="number"
                required
                value={timeSpent}
                onChange={e => setTimeSpent(Number(e.target.value))}
                className="w-full bg-white border border-gf-tea/35 p-3 text-sm text-gf-wood rounded focus:border-gf-wood focus:outline-none"
              />
            </div>

            {/* Completion Percent */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-gf-tea font-mono font-bold">
                全套工序物理完成比例 Proportion ({completionPercent}%)
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={completionPercent}
                onChange={e => setCompletionPercent(Number(e.target.value))}
                className="w-full accent-gf-wood h-2 py-3 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-widest text-white/50 font-mono block">
              模型背景观、写意背景故事及详细的着色与旧化工序心得 *
            </label>
            <textarea
              required
              rows={4}
              placeholder="请记叙此款微缩方案设计的世界观剧情、情景重温细节以及使用的特色旧化液流派过滤方法..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-[#181818] border border-white/10 p-3 text-sm text-white rounded focus:border-white focus:outline-none font-light"
            />
          </div>

          {/* Custom masterwork Specifications (Bento-style Specs input grid) */}
          <div className="p-4 bg-white/[0.01] border border-white/5 rounded space-y-4">
            <span className="text-[11px] uppercase tracking-[0.25em] text-amber-500 font-mono font-bold flex items-center gap-1.5 leading-none">
              <Sparkles className="w-4 h-4 text-amber-500" />
              设计高级规格参数 (Specs Builder) - 非必填
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase tracking-widest text-white/40 block font-mono">
                  空间体量 Dimensions
                </label>
                <input
                  type="text"
                  placeholder="如：240 * 60 * 75 cm"
                  value={dimensions}
                  onChange={e => setDimensions(e.target.value)}
                  className="w-full bg-[#181818] border border-white/10 p-2.5 text-xs text-white rounded focus:border-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase tracking-widest text-white/40 block font-mono">
                  构合材质 Structural Materials
                </label>
                <input
                  type="text"
                  placeholder="如：PVC (75%), 苯板 (10%), 树脂 (15%)"
                  value={materials}
                  onChange={e => setMaterials(e.target.value)}
                  className="w-full bg-[#181818] border border-white/10 p-2.5 text-xs text-white rounded focus:border-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase tracking-widest text-white/40 block font-mono">
                  筑造周期 Work Period
                </label>
                <input
                  type="text"
                  placeholder="如：2024/09 —— 2025/06"
                  value={period}
                  onChange={e => setPeriod(e.target.value)}
                  className="w-full bg-[#181818] border border-white/10 p-2.5 text-xs text-white rounded focus:border-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase tracking-widest text-white/40 block font-mono">
                  明清灵感古迹 Inspiration Source
                </label>
                <input
                  type="text"
                  placeholder="如：揭阳骑楼古城"
                  value={inspiration}
                  onChange={e => setInspiration(e.target.value)}
                  className="w-full bg-[#181818] border border-white/10 p-2.5 text-xs text-white rounded focus:border-white focus:outline-none"
                />
              </div>
            </div>

            {/* Signature Team */}
            <div className="space-y-1.5 text-left">
              <label className="text-[10px] uppercase tracking-widest text-white/40 block font-mono">
                筑造匠师团 Signature Craftsmen Team (输入姓名，英文或中文逗号分隔)
              </label>
              <input
                type="text"
                placeholder="例如：邓政松, 黄铭涛, 夏小军"
                value={authorsInput}
                onChange={e => setAuthorsInput(e.target.value)}
                className="w-full bg-[#181818] border border-white/10 p-2.5 text-xs text-white rounded focus:border-white focus:outline-none"
              />
            </div>
          </div>

          {/* Main Cover & Channel Images Manager */}
          <div className="p-4 bg-white/[0.01] border border-white/5 rounded space-y-4">
            <span className="text-[11px] uppercase tracking-[0.25em] text-amber-500 font-mono font-bold flex items-center gap-1.5 leading-none">
              <ImageIcon className="w-4 h-4 text-amber-500" />
              图片及视角图集管理器 (Macro Images Inspector & Preset Library)
            </span>

            {/* Cover image row */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-white/50 font-mono block">
                模型首要封面图链接 Cover Image URL * (点击文本框后可直接点击下方图板快速填入，或直接粘贴任何自定义网络连接)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  required
                  placeholder="https://..."
                  value={coverUrl}
                  onFocus={() => setFocusedImageIndex(-1)}
                  onChange={e => {
                    setCoverUrl(e.target.value);
                    if (images.length === 0) setImages([e.target.value]);
                  }}
                  className="flex-1 bg-[#181818] border border-white/10 p-2.5 text-xs font-mono text-white rounded focus:border-white focus:outline-none text-left"
                />
                <div className={`w-20 h-14 border overflow-hidden bg-black/40 rounded shrink-0 relative ${
                  localEditContext?.type === 'cover' ? 'ring-2 ring-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] border-amber-400' : 'border-white/10'
                }`}>
                  {coverUrl && <img src={coverUrl} alt="Cover Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                  {renderLocalTargetOverlay('cover')}
                </div>
              </div>
            </div>

            {/* Additional view angle images list */}
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <label className="text-[10px] uppercase tracking-widest text-white/50 font-mono block">
                  多维视角特写/微距图片图库 Multi-Angle Spotlight Images ({images.length})
                </label>
                <button
                  type="button"
                  onClick={addImageRow}
                  className="text-[9px] uppercase font-mono border border-white/10 hover:border-white/40 hover:bg-white/5 px-2 py-0.5 rounded text-white font-medium flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3" /> 追加视角
                </button>
              </div>

              {images.length > 0 ? (
                <div className="space-y-2">
                  {images.map((imgUrl, idx) => (
                    <div key={idx} className="flex gap-2 items-center bg-[#151515] p-2 rounded border border-white/[0.03]">
                      <span className="text-[10px] font-mono text-white/40 shrink-0 w-12 text-left">视角呢称 {String(idx + 1).padStart(2, '0')}:</span>
                      <input
                        type="text"
                        placeholder="https://..."
                        value={imgUrl}
                        onFocus={() => setFocusedImageIndex(idx)}
                        onChange={e => updateImageRow(idx, e.target.value)}
                        className="flex-1 bg-zinc-900 border border-white/5 p-2 text-xs font-mono text-white rounded focus:border-white text-left focus:outline-none"
                      />
                      <div className={`w-14 h-9 border overflow-hidden bg-black rounded shrink-0 relative ${
                        localEditContext?.type === 'angle' && localEditContext?.index === idx ? 'ring-2 ring-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] border-amber-400' : 'border-white/10'
                      }`}>
                        {imgUrl && <img src={imgUrl} alt={`Angle ${idx + 1}`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                        {renderLocalTargetOverlay('angle', idx)}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeImageRow(idx)}
                        className="text-red-400 hover:text-red-300"
                        title="删除该视角"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-[10px] text-white/30 italic p-3 border border-white/5 border-dashed rounded text-center">
                  暂未添加子视角镜头，主艺廊将默认仅展示其一张封面大图。请点击右上角追加新视角。
                </div>
              )}
            </div>
          </div>

          {/* Spatial Sub-Rooms & Detail Probes Compiler */}
          <div className="p-4 bg-white/[0.01] border border-white/5 rounded space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-[11px] uppercase tracking-[0.25em] text-amber-500 font-mono font-bold flex items-center gap-1.5 leading-none">
                <LayoutGrid className="w-4 h-4 text-amber-500" />
                生动室景与细节微距探头编辑器 (Spatial Chambers Detail Configurator)
              </span>
              <button
                type="button"
                onClick={addRoomRow}
                className="text-[10px] uppercase font-mono tracking-wider font-semibold border border-white/20 hover:border-white hover:bg-white/5 px-2.5 py-1 text-white rounded flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> 追加细节内堂室景
              </button>
            </div>
            
            <p className="text-[11px] text-white/40 leading-relaxed font-light">
              古典建筑或重工微缩项目需要细腻的细节特写。在此可以为本杰作添加一个或多个“细节房间”，访客可以通过特有的“室景探测器装置”单独点击这些房间，并加载微米级别贴近显像，探索隐藏细节。
            </p>

            {rooms.length > 0 ? (
              <div className="space-y-4 pt-1">
                {rooms.map((room, rIdx) => (
                  <div key={room.id} className="bg-[#151515] p-4 rounded border border-white/10 space-y-4 relative text-left">
                    <div className="flex justify-between items-center border-b border-white/5 pb-2">
                      <span className="text-xs font-serif text-amber-400 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-2.5 bg-amber-400 rounded-sm"></span>
                        室景室舍分划 #0{rIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => deleteRoomRow(rIdx)}
                        className="text-red-400 hover:text-red-300 text-[10px] font-mono flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> 移除细节室景
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Left Block */}
                      <div className="space-y-3">
                        {/* Room Name */}
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider text-white/40 font-mono">房舍命名 Room Name *</label>
                          <input
                            type="text"
                            required
                            placeholder="如：一楼 · 潮汕工夫茶肆"
                            value={room.name}
                            onChange={e => updateRoomField(rIdx, 'name', e.target.value)}
                            className="w-full bg-[#181818] border border-white/5 p-2 text-xs text-white rounded focus:border-white focus:outline-none"
                          />
                        </div>

                        {/* Room Cover Url */}
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider text-white/40 font-mono">该房舍主封面图 Cover Image URL *</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              required
                              placeholder="https://..."
                              value={room.coverUrl}
                              onFocus={() => setFocusedRoomIndex({ rIdx, iIdx: -1 })}
                              onChange={e => updateRoomField(rIdx, 'coverUrl', e.target.value)}
                              className="flex-1 bg-[#181818] border border-white/5 p-2 text-xs font-mono text-white rounded focus:border-white focus:outline-none text-left"
                            />
                            <div className={`w-14 h-9 border overflow-hidden bg-black rounded shrink-0 relative ${
                              localEditContext?.type === 'room-cover' && localEditContext?.roomIndex === rIdx ? 'ring-2 ring-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] border-amber-400' : 'border-white/10'
                            }`}>
                              {room.coverUrl && <img src={room.coverUrl} alt="Room cover" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                              {renderLocalTargetOverlay('room-cover', undefined, rIdx)}
                            </div>
                          </div>
                        </div>

                        {/* Room Description */}
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider text-white/40 font-mono">房舍与布景说文解字 Narrative *</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="请描述该房舍场景一隅的工艺和人文质感..."
                            value={room.description}
                            onChange={e => updateRoomField(rIdx, 'description', e.target.value)}
                            className="w-full bg-[#181818] border border-white/5 p-2 text-xs text-white rounded focus:border-white focus:outline-none font-light leading-relaxed"
                          />
                        </div>
                      </div>

                      {/* Right Block */}
                      <div className="space-y-3">
                        {/* Details bullet points */}
                        <div className="space-y-1">
                          <label className="text-[9px] uppercase tracking-wider text-white/40 font-mono">
                            微缩内置重工物料及饰件清单 Built-in Artifacts (每行一项)
                          </label>
                          <textarea
                            rows={3}
                            placeholder="如：&#10;1:12 珍品酸枝木八仙桌椅组&#10;手捏超细红泥小火炉与复古小茶具"
                            value={room.detailsList?.join('\n') || ''}
                            onChange={e => {
                              const list = e.target.value.split('\n').map(x => x.trim()).filter(Boolean);
                              updateRoomField(rIdx, 'detailsList', list);
                            }}
                            className="w-full bg-[#181818] border border-white/5 p-2 text-xs text-white rounded focus:border-white focus:outline-none font-mono"
                          />
                        </div>

                        {/* Detail microshots shots */}
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] uppercase tracking-wider text-white/40 font-mono">房舍探头微镜头特写 Micro Probes Images ({room.images.length})</label>
                            <button
                              type="button"
                              onClick={() => {
                                const sub = [...room.images, PRESET_IMAGES[1].url];
                                updateRoomField(rIdx, 'images', sub);
                              }}
                              className="text-[8px] uppercase font-mono tracking-wider border border-white/5 hover:border-white/20 hover:bg-white/5 px-2 py-0.5 rounded text-white"
                            >
                              + 追加微探照
                            </button>
                          </div>

                          {room.images.length > 0 ? (
                            <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                              {room.images.map((subImg, sIdx) => (
                                <div key={sIdx} className="flex gap-1.5 items-center bg-black/40 p-1.5 rounded border border-white/[0.02]">
                                  <span className="text-[8px] font-mono text-white/40 shrink-0">探头 {sIdx + 1}:</span>
                                  <input
                                    type="text"
                                    placeholder="https://..."
                                    value={subImg}
                                    onFocus={() => setFocusedRoomIndex({ rIdx, iIdx: sIdx })}
                                    onChange={e => {
                                      const sub = [...room.images];
                                      sub[sIdx] = e.target.value;
                                      updateRoomField(rIdx, 'images', sub);
                                    }}
                                    className="flex-1 bg-zinc-900 border border-white/5 p-1 text-[10px] font-mono text-white rounded focus:border-white text-left focus:outline-none"
                                  />
                                  <div className={`w-12 h-8 border overflow-hidden bg-black rounded shrink-0 relative ${
                                    localEditContext?.type === 'room-image' && localEditContext?.roomIndex === rIdx && localEditContext?.index === sIdx ? 'ring-2 ring-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] border-amber-400' : 'border-white/5'
                                  }`}>
                                    {subImg && <img src={subImg} alt="Sub Shot" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                                    {renderLocalTargetOverlay('room-image', sIdx, rIdx)}
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const sub = room.images.filter((_, subI) => subI !== sIdx);
                                      updateRoomField(rIdx, 'images', sub);
                                    }}
                                    className="text-red-400 hover:text-red-300"
                                    title="删除探头"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-[9px] text-white/30 italic text-center py-2 border border-white/5 border-dashed rounded">
                              暂无微镜探头特写，请追加探头提供探查点。
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-white/30 italic p-6 border border-white/5 border-dashed rounded text-center select-none">
                目前本杰作未声明任何局部细节解析舍。点击右上角“追加细节内堂室景”来开启生动的“房舍窥伺探索”，您亲自插入的细节图片都会展示在这里！
              </div>
            )}
          </div>

          {/* Steps list container */}
          <div className="pt-4 border-t border-white/5 space-y-4">
            <div className="flex justify-between items-baseline">
              <h3 className="text-xs uppercase tracking-widest text-[#9C9C9C] font-mono">
                WIP 核心制作工序生成时间轴 WIP Chrono-Steps Builder ({steps.length})
              </h3>
              <button
                type="button"
                onClick={addStepRow}
                className="text-[10px] uppercase font-mono tracking-wider font-semibold border border-white/20 hover:border-white hover:bg-white/5 px-2.5 py-1 text-white rounded flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" /> 追加新制作工项
              </button>
            </div>

            <div className="space-y-3">
              {steps.map((st, i) => (
                <div key={i} className="bg-[#181818] p-4 rounded border border-white/5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                  {/* Step parameters */}
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 flex-1 w-full text-left">
                    <input
                      type="text"
                      className="sm:col-span-3 bg-zinc-900 border border-white/10 text-xs text-white p-2 text-left"
                      placeholder="工序别称"
                      value={st.name}
                      onChange={e => {
                        const copy = [...steps];
                        copy[i].name = e.target.value;
                        setSteps(copy);
                      }}
                    />
                    <select
                      className="sm:col-span-2 bg-zinc-900 border border-white/20 text-xs text-white p-2 cursor-pointer text-left focus:border-white focus:outline-none font-sans hover:bg-zinc-800 hover:border-amber-400 hover:text-amber-400 transition-all duration-200"
                      value={st.status}
                      onChange={e => {
                        const copy = [...steps];
                        copy[i].status = e.target.value as any;
                        setSteps(copy);
                      }}
                    >
                      <option value="DONE" className="bg-[#181818] text-white font-sans">已完成并备忘</option>
                      <option value="ACTIVE" className="bg-[#181818] text-white font-sans">推进中 (ACTIVE)</option>
                      <option value="NEXT" className="bg-[#181818] text-white font-sans">排期待启动 (NEXT)</option>
                    </select>
                    <input
                      type="text"
                      className="sm:col-span-3 bg-zinc-900 border border-white/10 text-xs text-white p-2 text-left"
                      placeholder="主要工艺与耗材说明"
                      value={st.detail}
                      onChange={e => {
                        const copy = [...steps];
                        copy[i].detail = e.target.value;
                        setSteps(copy);
                      }}
                    />
                    {/* Process Image URL & Interactive Preview */}
                    <div className="sm:col-span-4 flex gap-1.5 items-center">
                      <input
                        type="text"
                        className="flex-1 bg-zinc-900 border border-white/10 text-[10px] text-white p-2 text-left font-mono"
                        placeholder="过程实地图链接(多图用逗号分割)"
                        value={st.images && st.images.length > 0 ? st.images.join(', ') : (st.image || '')}
                        onChange={e => {
                          const val = e.target.value;
                          const splitted = val.split(',').map(u => u.trim()).filter(Boolean);
                          const copy = [...steps];
                          copy[i].image = splitted[0] || '';
                          copy[i].images = splitted;
                          setSteps(copy);
                        }}
                        title="多张图片地址可以用半角逗号 ',' 隔开，在前台呈现时会排版成精美相册，点击能无损放大预览"
                      />
                      <div className={`w-10 h-7 border overflow-hidden bg-black rounded shrink-0 relative ${
                        localEditContext?.type === 'wip-process' && localEditContext?.index === i ? 'ring-2 ring-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] border-amber-400' : 'border-white/10'
                      }`}>
                        {st.image && <img src={st.image} alt="Step SNAP" className="w-full h-full object-cover" referrerPolicy="no-referrer" />}
                        {renderLocalTargetOverlay('wip-process', i)}
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => removeStepRow(i)}
                    className="text-red-400 hover:text-red-200 cursor-pointer self-end sm:self-auto"
                    title="移除该条工项"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action buttons */}
          <div className="pt-6 border-t border-white/5 flex justify-end gap-3 font-mono">
            <button
              type="button"
              onClick={resetProjectForm}
              className="px-5 py-3 border border-white/10 text-white hover:bg-white/5 text-xs uppercase cursor-pointer"
            >
              清空重置 Reset
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-white text-black text-xs uppercase font-bold tracking-widest hover:bg-amber-400 hover:text-black transition-colors cursor-pointer"
            >
              {editingId ? '保存本模型存根数据库' : '将全新杰作编目录入馆藏库'}
            </button>
          </div>
        </form>
      ) : null}

      {/* ADMIN TABS CONTENT */}

      {/* 1. MANAGE WORKS TAB */}
      {adminTab === 'projects' && !showAddForm ? (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-baseline gap-3">
            <h3 className="text-xs uppercase tracking-widest text-gf-tea font-mono text-left select-none font-bold">
              当前馆藏重工模型在库目录列表 REPOSITORY INVENTORY
            </h3>
            
            <button
              onClick={() => setShowAddForm(true)}
              className="px-4 py-2 bg-gf-wood text-gf-rice text-xs font-serif font-bold uppercase tracking-widest flex items-center gap-1.5 hover:bg-gf-wood/90 transition-colors cursor-pointer rounded shadow-xs"
            >
              <Plus className="w-4 h-4 text-gf-rice" /> 编录存入全新模型/场景杰作
            </button>
          </div>

          <div className="bg-white/50 border border-gf-tea/20 rounded overflow-x-auto shadow-sm">
            <table className="w-full text-left border-collapse text-xs md:text-sm">
              <thead className="bg-gf-wood/5 uppercase tracking-widest text-[9px] text-gf-tea border-b border-gf-tea/15 font-mono font-bold">
                <tr>
                  <th className="p-4">预览缩略</th>
                  <th className="p-4">微缩模型项目名称 Title</th>
                  <th className="p-4">比例</th>
                  <th className="p-4">门类</th>
                  <th className="p-4">在研状态</th>
                  <th className="p-4">累计设计时</th>
                  <th className="p-4 text-right">操作行为</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gf-tea/10 font-light text-left text-gf-wood">
                {projects.map(proj => (
                  <tr key={proj.id} className="hover:bg-white/40 transition-colors leading-normal">
                    <td className="p-4">
                      <div className="w-14 h-10 border border-gf-tea/15 overflow-hidden bg-gf-rice/30 rounded-sm">
                        {proj.coverUrl ? (
                          <img src={proj.coverUrl} alt={proj.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                        ) : null}
                      </div>
                    </td>
                    <td className="p-4 font-serif font-bold text-base text-gf-wood">{proj.title}</td>
                    <td className="p-4 font-mono font-medium">{proj.scale}</td>
                    <td className="p-4 font-serif font-semibold text-gf-tea">{proj.category}</td>
                    <td className="p-4">
                      <span className={`text-[8px] font-bold px-2 py-0.5 rounded font-mono uppercase border ${
                        proj.status === 'WIP'
                          ? 'bg-gf-sand/20 text-gf-wood border-gf-tea/20'
                          : proj.status === 'Completed'
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-250'
                          : 'bg-stone-50 text-stone-750 border-stone-200'
                      }`}>
                        {statusTranslations[proj.status] || proj.status}
                      </span>
                    </td>
                    <td className="p-4 font-mono font-bold text-gf-wood">{proj.timeSpent} 小时</td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      <button
                        onClick={() => startEditProject(proj)}
                        className="p-2 border border-gf-tea/20 rounded bg-white hover:bg-gf-rice text-gf-wood transition-all cursor-pointer inline-flex shadow-xs"
                        title="编辑项目"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => deleteProject(proj.id)}
                        className="p-2 border border-red-200 rounded bg-red-50 hover:bg-red-100 text-red-700 transition-all cursor-pointer inline-flex shadow-xs"
                        title="删除项目"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* 2. MANAGE REVIEWS TAB */}
      {adminTab === 'reviews' && (
        <div className="space-y-6">
          <h3 className="text-xs uppercase tracking-widest text-gf-tea font-mono text-left select-none font-bold">
            实时观众评鉴数据审查 REVIEWS LIST AUDIT
          </h3>

          {reviews.length > 0 ? (
            <div className="space-y-4">
              {reviews.map(rev => (
                <div
                  key={rev.id}
                  className="bg-white/50 border border-gf-tea/20 p-5 rounded space-y-4 transition-all text-left shadow-sm"
                >
                  <div className="flex flex-col sm:flex-row justify-between items-start gap-3 border-b border-gf-tea/15 pb-3">
                    <div className="space-y-1">
                      <h4 className="text-base font-serif text-gf-wood font-bold flex items-center gap-1.5 leading-none">
                        <User className="w-4 h-4 text-gf-tea/60" /> {rev.reviewerName}
                      </h4>
                      <p className="text-xs font-serif text-gf-tea font-medium">
                        打分对象: {rev.projectName}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex gap-0.5 text-gf-wood">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            style={{ width: '12px', height: '12px' }}
                            className={`${idx < rev.rating ? 'fill-gf-wood text-gf-wood' : 'text-stone-200'}`}
                          />
                        ))}
                      </div>
                      
                      <span className="text-[10px] font-mono text-gf-tea">
                        {new Date(rev.createdAt).toLocaleString()}
                      </span>
                    </div>
                  </div>

                  {/* Comment concept */}
                  <div className="text-xs leading-relaxed text-gf-wood bg-gf-sand/15 p-4 rounded border border-gf-tea/10 font-serif italic text-left">
                    " {rev.comment} "
                  </div>

                  {/* Actions buttons */}
                  <div className="pt-2 border-t border-gf-tea/15 flex justify-end">
                    <button
                      onClick={() => deleteReview(rev.id)}
                      className="text-red-700 hover:text-red-900 shrink-0 font-serif font-bold text-xs flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> 移去并从评鉴库下架此条记录 Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 border border-gf-tea/30 border-dashed bg-white/20 flex flex-col items-center justify-center rounded p-6 text-center select-none">
              <span className="text-sm font-mono text-gf-tea italic">暂无访客实时打分评论存根。</span>
              <p className="text-[10px] text-gf-tea/60 mt-1 uppercase tracking-widest font-mono">当馆内观众投递评鉴打分后将在此显示</p>
            </div>
          )}
        </div>
      )}

      {/* 3. MANAGE CATEGORIES TAB */}
      {adminTab === 'categories' && (
        <div className="space-y-6">
          <h3 className="text-xs uppercase tracking-widest text-gf-tea font-mono text-left select-none font-bold">
            模型馆藏门类管理与同步配置 CATEGORIES SYNCHRONIZATION
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* List and inline editors */}
            <div className="bg-white/50 border border-gf-tea/20 p-6 rounded space-y-4 text-left shadow-sm">
              <h4 className="text-sm font-serif italic text-gf-wood border-b border-gf-tea/15 pb-2 font-bold">当前分类列表 ({categories.length})</h4>
              
              <div className="space-y-3">
                {categories.map((cat, idx) => {
                  const isVisible = !hiddenCategories.includes(cat);
                  return (
                    <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 p-3 border border-gf-tea/10 rounded shadow-xs">
                      {editingCategoryIndex === idx ? (
                        <div className="flex gap-2 w-full">
                          <input
                            type="text"
                            value={editingCategoryName}
                            onChange={e => setEditingCategoryName(e.target.value)}
                            className="flex-1 bg-white border border-gf-tea/35 p-1 text-xs text-gf-wood rounded focus:border-gf-wood focus:outline-none focus:ring-1 focus:ring-gf-wood/55"
                          />
                          <button
                            onClick={() => handleSaveCategory(idx)}
                            className="px-2.5 py-1 bg-gf-wood text-gf-rice text-xs font-serif font-bold rounded cursor-pointer hover:bg-gf-wood/90"
                          >
                            保存
                          </button>
                          <button
                            onClick={() => setEditingCategoryIndex(null)}
                            className="px-2.5 py-1 bg-white border border-gf-tea/20 text-gf-wood text-xs rounded cursor-pointer hover:bg-gf-rice"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-3">
                            {/* Toggle Show/Hide Switch */}
                            <label className="flex items-center gap-1.5 cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={isVisible}
                                onChange={(e) => {
                                  const show = e.target.checked;
                                  if (show) {
                                    const updated = hiddenCategories.filter(item => item !== cat);
                                    onUpdateHiddenCategories(updated);
                                  } else {
                                    const updated = [...hiddenCategories, cat];
                                    onUpdateHiddenCategories(updated);
                                  }
                                }}
                                className="w-4 h-4 rounded text-gf-wood border-gf-tea/40 accent-gf-wood cursor-pointer"
                              />
                              <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                                isVisible 
                                  ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' 
                                  : 'bg-stone-50 text-stone-500 border border-stone-200'
                              }`}>
                                {isVisible ? '展示中' : '隐藏中'}
                              </span>
                            </label>
                            
                            <span className="text-sm text-gf-wood font-medium font-serif font-bold">{cat}</span>
                          </div>

                          <div className="flex items-center gap-2 self-end sm:self-auto">
                            <button
                              onClick={() => handleStartEditCategory(idx, cat)}
                              className="p-1.5 text-gf-tea hover:text-gf-wood transition-colors cursor-pointer border border-gf-tea/10 rounded hover:border-gf-wood/30 bg-white/40"
                              title="重命名并全局同步"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(cat)}
                              className="p-1.5 text-red-700 hover:text-red-900 transition-colors cursor-pointer border border-red-200 rounded hover:border-red-400 bg-red-50"
                              title="删除分类"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Add new category */}
            <div className="bg-white/50 border border-gf-tea/20 p-6 rounded text-left space-y-4 shadow-sm">
              <h4 className="text-sm font-serif italic text-gf-wood border-b border-gf-tea/15 pb-2 flex items-center gap-1.5 font-bold">
                <Plus className="w-4 h-4 text-gf-wood" /> 录入全新模型分类
              </h4>
              
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] uppercase tracking-widest text-gf-tea font-mono block font-bold">分类名称 Name</label>
                  <input
                    type="text"
                    placeholder="例如：古典建筑、怀旧街景"
                    value={newCategoryName}
                    onChange={e => setNewCategoryName(e.target.value)}
                    className="w-full bg-white border border-gf-tea/35 p-2 text-xs text-gf-wood rounded focus:border-gf-wood focus:outline-none focus:ring-1 focus:ring-gf-wood/55"
                  />
                </div>

                <button
                  onClick={handleAddCategory}
                  className="w-full py-2 bg-gf-wood hover:bg-gf-wood/90 text-gf-rice font-semibold font-serif text-xs uppercase tracking-widest transition-all rounded duration-300 flex items-center justify-center gap-1 cursor-pointer shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> 确认录入分类 Register Category
                </button>
              </div>

              {/* Informative text */}
              <div className="text-[11px] text-gf-tea leading-relaxed font-mono">
                [技术说明]: 每个分类都可以单独设置展示或隐藏状态。编辑或重命名某一分类名字后，后台会将馆藏库中所有关联此分类的古迹模型一并更新（数据库级同步）。
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. CHIEF MASTER WECHAT SETTINGS TAB */}
      {adminTab === 'settings' && (
        <div className="bg-white/80 border border-gf-tea/20 p-6 md:p-8 rounded space-y-6 text-left shadow-md max-w-4xl">
          <div className="border-b border-gf-tea/15 pb-3">
            <h2 className="text-xl font-serif text-gf-wood font-bold select-none">
              主理人微信及联络印信设定 WeChat Settings
            </h2>
            <p className="text-xs text-gf-tea/80 font-light mt-0.5">
              编辑和管理投递评分卡处显示的主理人微信二维码图片与微信号 ID。支持本地一键选图，或直接在锁定后拖放/Ctrl+V粘贴替换。
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
            {/* WeChat ID edit */}
            <div className="space-y-5">
              <div className="space-y-1.5 text-left">
                <label className="text-[10px] uppercase tracking-widest text-[#A38A6C] font-mono font-bold block">
                  主理人微信号 WeChat ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="请输入您的微信号 ID"
                  value={studioSettings?.wechatId || ''}
                  onChange={(e) => {
                    if (onUpdateSettings && studioSettings) {
                      onUpdateSettings({
                        ...studioSettings,
                        wechatId: e.target.value
                      });
                    }
                  }}
                  className="w-full px-3 py-2 bg-white border border-gf-tea/35 rounded text-sm text-gf-wood font-mono focus:border-gf-wood focus:outline-none focus:ring-1 focus:ring-gf-wood"
                />
              </div>

              {/* Local File Picker for convenience */}
              <div className="space-y-2 text-left pt-2 border-t border-gf-tea/10">
                <span className="text-[10px] uppercase tracking-widest text-[#A38A6C] font-mono font-bold block">
                  本地上传二维码图像 Upload Local File
                </span>
                <p className="text-xs text-gf-tea font-light leading-snug">
                  除了选择右侧目标框后直接<strong>将二维码图片拖入网页</strong>替换之外，您也可以通过下方文件按钮在此处立刻从电脑文件夹中点击选取上传：
                </p>
                
                <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-gf-wood hover:bg-stone-850 text-gf-rice hover:text-white rounded text-xs font-serif font-medium cursor-pointer transition-colors shadow-xs">
                  <Upload className="w-4 h-4" />
                  <span>选择本地二维码文件</span>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        try {
                          const dataUrl = await compressImage(file, 0.15);
                          if (onUpdateSettings && studioSettings) {
                            onUpdateSettings({
                              ...studioSettings,
                              wechatQrUrl: dataUrl
                            });
                          }
                        } catch (err) {
                          console.error(err);
                        }
                      }
                    }}
                  />
                </label>
              </div>
            </div>

            {/* QR Code preview block with interactive target highlighter */}
            <div className="space-y-2 text-center">
              <span className="text-[10px] uppercase tracking-widest text-[#A38A6C] font-mono font-bold block">
                二维码印信预览 QR Code Preview
              </span>
              
              {/* Box frame target selection */}
              <div
                onClick={() => {
                  if (setActiveEditContext && studioSettings) {
                    if (activeEditContext?.type === 'master-qr') {
                      setActiveEditContext(null);
                    } else {
                      setActiveEditContext({ type: 'master-qr' });
                    }
                  }
                }}
                className={`aspect-square w-52 mx-auto rounded border overflow-hidden relative flex flex-col items-center justify-center bg-white shadow-inner cursor-pointer hover:border-amber-400 p-2.5 transition-all ${
                  activeEditContext?.type === 'master-qr'
                    ? 'border-amber-500 ring-4 ring-amber-400/30'
                    : 'border-gf-tea/20'
                }`}
              >
                {studioSettings?.wechatQrUrl ? (
                  <img
                    src={studioSettings.wechatQrUrl}
                    alt="主理人微信二维码"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="p-4 space-y-1.5 text-center">
                    <QrCode className="w-12 h-12 text-gf-tea/50 mx-auto" />
                    <span className="text-xs text-gf-tea font-mono block">未设置主理微信二维码</span>
                  </div>
                )}

                <div className="absolute inset-x-0 bottom-0 bg-stone-900/90 text-[10px] text-gf-sand py-2 text-center font-sans tracking-wide">
                  {activeEditContext?.type === 'master-qr'
                    ? '⚡ 已锁定！请拖放文件或 Ctrl+V 替换'
                    : '🎯 点击锁定：启动“网页拖放图片/粘贴”支持'}
                </div>
              </div>

              <p className="text-[10px] text-gf-tea italic leading-relaxed pt-2">
                * 修改即刻存储并在网页中生效。游客点击底栏评说下的合作通道时即可一键复制并唤起您的专属微信联络码。
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
