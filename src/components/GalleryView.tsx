import { useState, useEffect } from 'react';
import { Project, ProjectCategory, CraftsmanProfile } from '../types';
import { ImageEditContext } from '../App';
import { compressImage } from '../imageResizer';
import DetailMagnifier from './DetailMagnifier';
import { 
  Clock, 
  Layers, 
  Star, 
  Info, 
  CheckCircle2,
  Ruler,
  Box,
  CalendarDays,
  Compass,
  Users,
  Sparkles,
  Eye,
  Award,
  QrCode,
  X,
  Copy,
  Check,
  Upload
} from 'lucide-react';

interface GalleryViewProps {
  projects: Project[];
  categories: string[];
  hiddenCategories?: string[];
  isAdmin?: boolean;
  activeEditContext?: ImageEditContext | null;
  setActiveEditContext?: (ctx: ImageEditContext | null) => void;
  craftsmenProfiles?: Record<string, CraftsmanProfile>;
  onUpdateCraftsmenProfiles?: (profiles: Record<string, CraftsmanProfile>) => void;
}

export default function GalleryView({ 
  projects, 
  categories, 
  hiddenCategories = [], 
  isAdmin = false,
  activeEditContext = null,
  setActiveEditContext,
  craftsmenProfiles = {},
  onUpdateCraftsmenProfiles
}: GalleryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | 'All'>('All');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Craftsman Popover / Modal state
  const [activeCraftsmanName, setActiveCraftsmanName] = useState<string | null>(null);
  const [craftsmanWechatIdInput, setCraftsmanWechatIdInput] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);

  const handleOpenCraftsmanModal = (name: string) => {
    setActiveCraftsmanName(name);
    setIsCopied(false);
    const profile = craftsmenProfiles?.[name];
    setCraftsmanWechatIdInput(profile?.wechatId || '');
  };


  // Helper to determine if a specific image element is highlighted/selected for editing
  const getIsSelected = (type: string, details?: { index?: number; roomId?: string; craftsmanName?: string }) => {
    if (!isAdmin || !activeEditContext) return false;
    if (activeEditContext.type !== type) return false;
    
    if (type === 'project-cover' && selectedProject) {
      return activeEditContext.projectId === selectedProject.id;
    }
    if (type === 'project-image' && selectedProject && details?.index !== undefined) {
      return activeEditContext.projectId === selectedProject.id && activeEditContext.imageIndex === details.index;
    }
    if (type === 'room-cover' && selectedProject && details?.roomId) {
      return activeEditContext.projectId === selectedProject.id && activeEditContext.roomId === details.roomId;
    }
    if (type === 'room-image' && selectedProject && details?.roomId && details?.index !== undefined) {
      return activeEditContext.projectId === selectedProject.id && activeEditContext.roomId === details.roomId && activeEditContext.imageIndex === details.index;
    }
    if (type === 'craftsman-qr' && details?.craftsmanName) {
      return activeEditContext.craftsmanName === details.craftsmanName;
    }
    return false;
  };

  // Click on image box in Admin mode triggers editing targeted focus
  const handleSelectEditImage = (
    type: 'project-cover' | 'project-image' | 'room-cover' | 'room-image' | 'craftsman-qr', 
    details?: { index?: number; roomId?: string; craftsmanName?: string }
  ) => {
    if (!isAdmin || !setActiveEditContext) return;
    
    if (getIsSelected(type, details)) {
      setActiveEditContext(null); // click again to clear selection
    } else {
      setActiveEditContext({
        type,
        projectId: selectedProject?.id,
        imageIndex: details?.index,
        roomId: details?.roomId,
        craftsmanName: details?.craftsmanName
      });
    }
  };

  // Filter visible categories
  const visibleCategories = categories.filter(c => !hiddenCategories.includes(c));
  const allCategories = ['All', ...visibleCategories];

  // Force reset selectedCategory if current selected is hidden
  useEffect(() => {
    if (selectedCategory !== 'All' && hiddenCategories.includes(selectedCategory)) {
      setSelectedCategory('All');
    }
  }, [hiddenCategories, selectedCategory]);

  // Filter projects based on selected category / visibility
  const filteredProjects = selectedCategory === 'All'
    ? projects.filter(p => !hiddenCategories.includes(p.category))
    : projects.filter(p => p.category === selectedCategory);

  // Sync selected project when category changes
  useEffect(() => {
    if (filteredProjects.length > 0) {
      setSelectedProject(filteredProjects[0]);
      setActiveImage(filteredProjects[0].coverUrl);
      setSelectedRoomId(null);
    } else {
      setSelectedProject(null);
      setActiveImage('');
      setSelectedRoomId(null);
    }
  }, [selectedCategory, projects, hiddenCategories]);

  // Sync active image when project changes
  const selectProject = (proj: Project) => {
    setSelectedProject(proj);
    setActiveImage(proj.coverUrl);
    setSelectedRoomId(null);
    setSlideshowKey(prev => prev + 1); // reset slideshow timer on project change
  };

  // Slideshow key to reset the timer on manual thumbnail clicks
  const [slideshowKey, setSlideshowKey] = useState<number>(0);

  // Automatic image sliding every 2.5 seconds
  useEffect(() => {
    if (!selectedProject || !selectedProject.images || selectedProject.images.length <= 1) return;

    const interval = setInterval(() => {
      setActiveImage(prev => {
        const idx = selectedProject.images.indexOf(prev);
        const nextIdx = idx === -1 ? 0 : (idx + 1) % selectedProject.images.length;
        return selectedProject.images[nextIdx];
      });
    }, 2500);

    return () => clearInterval(interval);
  }, [selectedProject, slideshowKey]);

  const statusTranslations: Record<string, string> = {
    'WIP': '制作中 (WIP)',
    'Completed': '已征全/已完成',
    'Sold': '藏家已奉收'
  };

  const stepStatusTranslations: Record<string, string> = {
    'DONE': '木作圆满',
    'ACTIVE': '精工嵌合',
    'NEXT': '备材待续'
  };

  return (
    <div className="flex-1 h-screen flex flex-col p-4 md:p-8 lg:p-12 macro-gradient overflow-y-auto">
      {/* Editorial Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline mb-8 gap-4 border-b border-gf-wood/10 pb-6">
        <div className="flex flex-col text-left">
          <h1 className="text-3xl md:text-5xl font-serif text-gf-wood tracking-tight leading-none font-bold drop-shadow-sm">
            袖珍物華 <span className="text-gf-tea/60 font-serif italic text-2xl font-normal block md:inline md:ml-2">The Micro Specter</span>
          </h1>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] mt-3 font-semibold text-gf-tea block opacity-80">
            {selectedProject ? `当前选定 // ${selectedProject.category} // 制作比例 ${selectedProject.scale}` : '请选择一个模型馆藏门类'}
          </p>
        </div>

        {/* Editorial Category Tags */}
        <nav className="flex flex-wrap gap-2 md:gap-3 md:text-xs uppercase tracking-widest font-mono text-[9px] select-none text-gf-tea">
          {allCategories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 border transition-all duration-300 ease-out cursor-pointer rounded-sm ${
                selectedCategory === cat
                  ? 'border-gf-wood text-gf-wood font-medium bg-gf-sand/20 premium-shadow'
                  : 'border-gf-tea/15 hover:text-gf-wood hover:border-gf-tea/40 bg-white/30 hover:premium-shadow'
              }`}
            >
              {cat === 'All' ? '全部作品' : cat}
            </button>
          ))}
        </nav>
      </header>

      {selectedProject ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Main Showcase Container (Column span 8 in 12) */}
          <div className="lg:col-span-8 flex flex-col gap-6 h-full">
            <div className="relative aspect-[16/10] bg-gf-rice/35 rounded border border-gf-tea/20 flex items-center justify-center overflow-hidden group premium-shadow">
              {/* Subtle background abstract aura */}
              <div className="absolute w-[120%] h-[120%] bg-gf-sand/10 opacity-30 rounded-full blur-3xl"></div>
              
              {/* Macro label overlay */}
              <div className="absolute top-6 right-6 text-right z-10 pointer-events-none select-none">
                <div className="text-4xl md:text-7xl font-serif italic font-extrabold opacity-[0.05] text-gf-wood leading-none">
                  微距透视
                </div>
              </div>

              {/* Advanced Magnifying Viewport */}
              {activeImage && (
                <DetailMagnifier
                  src={activeImage}
                  alt={selectedProject.title}
                  className="w-full h-full object-cover"
                  zoomLevel={3}
                />
              )}

              {/* Admin Click-To-Select Target Overlay */}
              {isAdmin && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    const idx = selectedProject.images.indexOf(activeImage);
                    if (idx === -1 && activeImage === selectedProject.coverUrl) {
                      handleSelectEditImage('project-cover');
                    } else if (idx !== -1) {
                      handleSelectEditImage('project-image', { index: idx });
                    }
                  }}
                  className={`absolute top-4 right-4 z-20 px-3 py-1.5 rounded-sm text-[10px] font-sans font-bold shadow-md transition-all border cursor-pointer select-none ${
                    (selectedProject.images.indexOf(activeImage) === -1 && activeImage === selectedProject.coverUrl && getIsSelected('project-cover')) ||
                    (selectedProject.images.indexOf(activeImage) !== -1 && getIsSelected('project-image', { index: selectedProject.images.indexOf(activeImage) }))
                      ? 'bg-amber-500 text-stone-950 border-stone-950 animate-pulse'
                      : 'bg-stone-900 border-gf-sand/30 text-gf-sand hover:text-white hover:bg-stone-950'
                  }`}
                >
                  {(selectedProject.images.indexOf(activeImage) === -1 && activeImage === selectedProject.coverUrl && getIsSelected('project-cover')) ||
                  (selectedProject.images.indexOf(activeImage) !== -1 && getIsSelected('project-image', { index: selectedProject.images.indexOf(activeImage) }))
                    ? '🔥 拖放图片在此或按 Ctrl+V 替换 (当前活动目标)'
                    : '🎯 选中当前大图框更换画面'}
                </button>
              )}

              {/* Hover Helper Bar */}
              <div className="absolute top-4 left-4 bg-gf-wood/90 backdrop-blur-md px-3 py-1 border border-gf-tea/40 text-[9px] tracking-widest text-gf-sand font-mono flex items-center gap-1.5 rounded shadow-sm">
                <span className="w-1.5 h-1.5 bg-gf-sand rounded-full animate-ping"></span>
                鼠标悬停放大，探察微缩涂装细节
              </div>
            </div>

            {/* Micro Gallery Slide Multi-Angle Navigation Buttons */}
            <div className="flex gap-3 overflow-x-auto py-1">
              {selectedProject.images.map((img, i) => {
                const isSelected = isAdmin && getIsSelected('project-image', { index: i });
                return (
                  <button
                    key={i}
                    onClick={() => {
                      setActiveImage(img);
                      setSlideshowKey(prev => prev + 1); // Reset slideshow timer on user manual interaction
                    }}
                    className={`relative w-20 md:w-28 aspect-video bg-white/40 border overflow-hidden shrink-0 transition-all cursor-pointer rounded-sm ${
                      activeImage === img 
                        ? 'border-gf-wood ring-2 ring-gf-sand/40 opacity-100 shadow-sm' 
                        : 'border-gf-tea/15 opacity-60 hover:opacity-100 hover:border-gf-tea/40'
                    } ${
                      isSelected ? 'border-amber-500 ring-2 ring-amber-400/60 shadow-[0_0_8px_rgba(245,158,11,0.5)]' : ''
                    }`}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={`视角 ${i + 1}`}
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : null}
                    <span className="absolute bottom-1 right-1 text-[8px] font-mono bg-gf-wood/80 px-1 py-0.2 rounded text-gf-rice">
                      视角-{String(i + 1).padStart(2, '0')}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Description & Narrative */}
            <div className="p-6 soft-glass rounded premium-shadow text-left">
              <span className="text-[10px] uppercase tracking-[0.25em] text-gf-tea mb-3 block font-mono font-medium">背景设定与工艺解说 Narrative</span>
              <p className={`text-sm md:text-base leading-relaxed text-gf-wood/90 font-light ${selectedProject.id === 'qilou-yanduo' ? 'italic text-gf-wood/95 font-serif' : ''}`}>
                {selectedProject.description}
              </p>
            </div>

            {/* 1. Project Specifications Bento Grid */}
            {(selectedProject.dimensions || selectedProject.materials || selectedProject.period || selectedProject.inspiration) && (
              <div className="p-6 soft-glass rounded premium-shadow space-y-4 text-left">
                <span className="text-[10px] uppercase tracking-[0.25em] text-gf-wood font-mono flex items-center gap-1.5 font-bold">
                  <Award className="w-4 h-4 text-gf-wood" />
                  珍品存证 · 筑造规格 Masterpiece Specifications
                </span>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                  {selectedProject.dimensions && (
                    <div className="flex items-start gap-3 p-3 bg-white/60 border border-gf-tea/10 rounded text-left">
                      <Ruler className="w-4 h-4 text-gf-tea mt-0.5 shrink-0" />
                      <div className="min-w-0 text-left">
                        <span className="text-[9px] uppercase tracking-wider text-gf-tea/70 block font-mono">空间体量 Dimensions</span>
                        <span className="text-xs text-gf-wood font-semibold">{selectedProject.dimensions}</span>
                      </div>
                    </div>
                  )}

                  {selectedProject.period && (
                    <div className="flex items-start gap-3 p-3 bg-white/60 border border-gf-tea/10 rounded text-left">
                      <CalendarDays className="w-4 h-4 text-gf-tea mt-0.5 shrink-0" />
                      <div className="min-w-0 text-left">
                        <span className="text-[9px] uppercase tracking-wider text-gf-tea/70 block font-mono">筑造周期 Work Period</span>
                        <span className="text-xs text-gf-wood font-semibold">{selectedProject.period}</span>
                      </div>
                    </div>
                  )}

                  {selectedProject.inspiration && (
                    <div className="flex items-start gap-3 p-3 bg-white/60 border border-gf-tea/10 rounded text-left">
                      <Compass className="w-4 h-4 text-gf-tea mt-0.5 shrink-0" />
                      <div className="min-w-0 text-left">
                        <span className="text-[9px] uppercase tracking-wider text-gf-tea/70 block font-mono">明清灵感 Inspiration Source</span>
                        <span className="text-xs text-gf-wood font-semibold">{selectedProject.inspiration}</span>
                      </div>
                    </div>
                  )}

                  {selectedProject.materials && (
                    <div className="flex items-start gap-3 p-3 bg-white/60 border border-gf-tea/10 rounded text-left">
                      <Box className="w-4 h-4 text-gf-tea mt-0.5 shrink-0" />
                      <div className="min-w-0 text-left">
                        <span className="text-[9px] uppercase tracking-wider text-gf-tea/70 block font-mono">大构合材 Structural Materials</span>
                        <span className="text-xs text-gf-wood font-semibold truncate block">{selectedProject.materials}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Authors (匠师印信) */}
                {selectedProject.authors && selectedProject.authors.length > 0 && (
                  <div className="pt-3 border-t border-gf-tea/15 text-left">
                    <span className="text-[9px] uppercase tracking-wider text-gf-tea block mb-2 font-mono flex items-center gap-1.5 font-medium">
                      <Users className="w-3.5 h-3.5 text-gf-tea" />
                      筑造匠师团 Signature Craftsmen Team
                    </span>
                    <div className="flex flex-wrap gap-2 justify-start">
                      {selectedProject.authors.map((auth, index) => (
                        <button
                          key={index}
                          type="button"
                          onClick={() => handleOpenCraftsmanModal(auth)}
                          title={`察看关于匠师 ${auth} 的联络印信`}
                          className="px-2.5 py-1 text-xs bg-gf-wood/5 hover:bg-gf-wood/10 text-gf-wood hover:text-stone-900 border border-gf-tea/30 hover:border-gf-wood rounded transition-all font-serif cursor-pointer flex items-center gap-1.5 select-none"
                        >
                          <span>印 • {auth}</span>
                          <QrCode className="w-3 h-3 opacity-60 group-hover:opacity-100" />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 2. Room Detail Explorer / Spatial Decomposition */}
            {selectedProject.rooms && selectedProject.rooms.length > 0 && (
              <div className="p-6 soft-glass rounded premium-shadow space-y-6 text-left">
                <div>
                  <span className="text-[10px] uppercase tracking-[0.25em] text-gf-wood font-mono block mb-1 font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-gf-wood" />
                    空间细部拆解 · 室景深度探秘 Spatial Rooms Inspector
                  </span>
                  <p className="text-xs text-gf-tea leading-relaxed font-light">
                    古典建筑重工微缩项目包含多处可透视内部细节，点击下方室景卡片以调遣“多维微距探测器”深入探析其隐藏装潢、微型家具和非凡巧思。
                  </p>
                </div>

                {/* Rooms selection selector */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {selectedProject.rooms.map((room) => {
                    const isActive = selectedRoomId === room.id;
                    const isSelectedForEdit = isAdmin && getIsSelected('room-cover', { roomId: room.id });
                    return (
                      <button
                        key={room.id}
                        type="button"
                        onClick={() => setSelectedRoomId(isActive ? null : room.id)}
                        className={`relative aspect-video rounded overflow-hidden border cursor-pointer group text-left transition-all ${
                          isActive
                            ? 'border-gf-wood ring-2 ring-gf-sand shadow-sm'
                            : 'border-gf-tea/15 hover:border-gf-tea/40'
                        } ${
                          isSelectedForEdit ? 'ring-2 ring-amber-500 border-amber-500' : ''
                        }`}
                      >
                        {room.coverUrl ? (
                          <img
                            src={room.coverUrl}
                            alt={room.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 filter brightness-95 grayscale-[12%] group-hover:grayscale-0"
                            referrerPolicy="no-referrer"
                          />
                        ) : null}

                        {/* Interactive Edit target trigger indicator */}
                        {isAdmin && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation(); // Avoid triggering open/close room select
                              handleSelectEditImage('room-cover', { roomId: room.id });
                            }}
                            title="锁定此室景覆盖图用于拖放替换"
                            className={`absolute top-1.5 right-1.5 z-25 p-1 rounded-full border shadow-md transition-all ${
                              isSelectedForEdit
                                ? 'bg-amber-500 text-stone-950 border-stone-950 animate-pulse scale-105'
                                : 'bg-stone-900/80 text-gf-sand border-gf-sand/10 hover:bg-stone-950 hover:text-white'
                            }`}
                          >
                            <Sparkles className="w-2.5 h-2.5" />
                          </div>
                        )}
                        <div className="absolute inset-0 bg-gradient-to-t from-gf-wood via-black/20 to-transparent flex flex-col justify-end p-2 md:p-3">
                          <span className={`text-xs font-serif leading-tight ${isActive ? 'text-gf-sand font-bold' : 'text-gf-rice font-medium'}`}>
                            {room.name}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                {/* Opened Room specifications and Close-ups */}
                {selectedRoomId && (() => {
                  const room = selectedProject.rooms?.find(r => r.id === selectedRoomId);
                  if (!room) return null;
                  return (
                    <div className="p-5 bg-white/75 border border-gf-tea/15 rounded-sm space-y-5 shadow-inner">
                      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-gf-tea/15 pb-3">
                        <h4 className="text-base font-serif text-gf-wood font-bold flex items-center gap-2">
                          <span className="w-1.5 h-3 bg-gf-wood rounded-sm"></span>
                          当前察看室景：{room.name}
                        </h4>
                        <button
                          type="button"
                          onClick={() => setSelectedRoomId(null)}
                          className="text-[10px] font-mono text-gf-tea hover:text-gf-wood hover:underline cursor-pointer"
                        >
                          收起拆解 [Close]
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                        {/* Left description details list */}
                        <div className="md:col-span-7 space-y-4 text-left">
                          <div className="space-y-1.5">
                            <span className="text-[9px] uppercase tracking-wider text-gf-wood font-mono font-bold block">室景精舍解说 Core Description</span>
                            <p className="text-sm text-gf-wood/90 leading-relaxed font-light font-sans text-left">
                              {room.description}
                            </p>
                          </div>

                          {room.detailsList && room.detailsList.length > 0 && (
                            <div className="space-y-2 text-left">
                              <span className="text-[9px] uppercase tracking-wider text-gf-wood font-mono font-bold block">微缩重工及装设细项 Built-in Artifacts</span>
                              <div className="grid grid-cols-1 gap-1.5 justify-start">
                                {room.detailsList.map((det, index) => (
                                  <div key={index} className="flex items-start gap-2 text-xs font-light text-gf-wood/80 text-left">
                                    <CheckCircle2 className="w-3.5 h-3.5 text-gf-wood/70 shrink-0 mt-0.5" />
                                    <span>{det}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Right Close-ups & Focus Controller */}
                        <div className="md:col-span-5 space-y-3 text-left">
                          <span className="text-[9px] uppercase tracking-wider text-gf-wood font-mono font-bold block flex items-center gap-1">
                            <Eye className="w-3.5 h-3.5" />
                            多维超高清微距镜探照 Focus Probe
                          </span>
                          
                          <div className="grid grid-cols-2 gap-2 justify-start">
                            {room.images.map((imgUrl, i) => {
                              const isShowing = activeImage === imgUrl;
                              const isSelectedForEdit = isAdmin && getIsSelected('room-image', { roomId: selectedRoomId, index: i });
                              return (
                                <button
                                  key={i}
                                  type="button"
                                  onClick={() => setActiveImage(imgUrl)}
                                  className={`relative aspect-video bg-gf-rice/30 border shrink-0 rounded overflow-hidden group cursor-pointer transition-all ${
                                    isShowing ? 'border-gf-wood ring-2 ring-gf-sand/40' : 'border-gf-tea/10 opacity-70 hover:opacity-100'
                                  } ${
                                    isSelectedForEdit ? 'ring-2 ring-amber-500 border-amber-500' : ''
                                  }`}
                                >
                                  {imgUrl ? (
                                    <img
                                      src={imgUrl}
                                      alt="Close-up View"
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                                      referrerPolicy="no-referrer"
                                    />
                                  ) : null}

                                  {/* Interactive Edit Target Select Trigger */}
                                  {isAdmin && (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation(); // Avoid triggering visual thumbnail swap
                                        handleSelectEditImage('room-image', { roomId: selectedRoomId, index: i });
                                      }}
                                      title="锁定此微探头画幅用于拖放替换"
                                      className={`absolute top-1 right-1 z-25 p-1 rounded-full border shadow transition-all ${
                                        isSelectedForEdit
                                          ? 'bg-amber-500 text-stone-950 border-stone-950 animate-pulse'
                                          : 'bg-stone-900/80 text-gf-sand border-gf-sand/10 hover:bg-stone-950 hover:text-white'
                                      }`}
                                    >
                                      <Sparkles className="w-2 h-2" />
                                    </div>
                                  )}

                                  <div className="absolute inset-0 bg-black/25 group-hover:bg-transparent transition-colors flex items-center justify-center">
                                    <span className="text-[8px] font-mono tracking-widest text-gf-rice bg-gf-wood/90 px-1 py-0.5 rounded flex items-center gap-1 font-semibold group-hover:bg-gf-wood group-hover:text-gf-sand">
                                      探头 {String(i + 1).padStart(2, '0')}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>

                          <div className="p-3 bg-gf-wood/5 rounded border border-gf-tea/20 text-[10px] leading-relaxed text-gf-wood font-mono">
                            💡 **操作提示**: 点击上方微探头，无损微距照片将载入主视图，以便在主画面体验细节。
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>

          {/* Sidebar Panel containing metadata and current project list (Column span 4 in 12) */}
          <div className="lg:col-span-4 flex flex-col gap-6">
            {/* Core Stats Card */}
            <div className="soft-glass p-6 rounded premium-shadow space-y-6 text-left">
              <div className="flex justify-between items-start border-b border-gf-tea/15 pb-4">
                <div className="text-left">
                  <h2 className="text-xl md:text-2xl font-serif text-gf-wood font-bold">{selectedProject.title}</h2>
                  <span className="text-[10px] uppercase tracking-widest font-mono text-gf-wood/80 block mt-1 font-medium">{selectedProject.category} / {selectedProject.scale}</span>
                </div>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                  selectedProject.status === 'WIP'
                    ? 'bg-gf-sand/30 text-gf-wood border border-gf-tea/20'
                    : selectedProject.status === 'Completed'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-stone-200 text-stone-700 border border-stone-300'
                }`}>
                  {statusTranslations[selectedProject.status] || selectedProject.status}
                </span>
              </div>

              {/* Parameters metrics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/40 border border-gf-tea/10 p-4 rounded text-center shadow-xs">
                  <span className="text-[9px] uppercase tracking-widest text-gf-tea block mb-1 font-medium">设计耗时 Spent</span>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <Clock className="w-4 h-4 text-gf-tea" />
                    <span className="text-lg md:text-xl font-bold font-serif text-gf-wood">{selectedProject.timeSpent} 小时</span>
                  </div>
                </div>

                <div className="bg-white/40 border border-gf-tea/10 p-4 rounded text-center shadow-xs">
                  <span className="text-[9px] uppercase tracking-widest text-gf-tea block mb-1 font-medium">完成比例 Progress</span>
                  <div className="flex items-center justify-center gap-1.5 mt-1">
                    <Star className="w-4 h-4 text-gf-tea" />
                    <span className="text-lg md:text-xl font-bold font-serif text-gf-wood">{selectedProject.completionPercent}%</span>
                  </div>
                </div>
              </div>

              {/* Mini WIP timeline summary */}
              {selectedProject.worksteps && selectedProject.worksteps.length > 0 && (
                <div className="space-y-3 pt-2 text-left">
                  <h3 className="text-[10px] uppercase tracking-wider text-gf-wood font-mono flex items-center gap-1.5 font-bold">
                    <Info className="w-3.5 h-3.5 text-gf-tea" /> 关键制作里程碑 Progress Milestones
                  </h3>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {selectedProject.worksteps.map((step) => (
                      <div key={step.id} className="flex justify-between items-center text-xs p-1.5 rounded bg-white/65 border border-gf-tea/10 text-left">
                        <span className={`font-serif text-left transition-colors ${step.status === 'ACTIVE' ? 'text-gf-wood font-semibold' : 'text-gf-wood/50'}`}>
                          {step.name}
                        </span>
                        <span className={`text-[8px] px-1.5 py-0.5 rounded uppercase font-mono font-bold tracking-wider ${
                          step.status === 'DONE'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300/35'
                            : step.status === 'ACTIVE'
                            ? 'bg-gf-wood text-gf-sand'
                            : 'border border-gf-tea/10 text-gf-tea/60'
                        }`}>
                          {stepStatusTranslations[step.status] || step.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Alternating matching projects sidebar listing */}
            <div className="space-y-3 text-left">
              <h3 className="text-[10px] uppercase tracking-[0.2em] text-gf-tea font-mono font-semibold">
                {selectedCategory === 'All' ? '其他工艺存档馆藏 Other Archives' : `更多在 ${selectedCategory} 分类中`}
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3 max-h-[300px] overflow-y-auto pr-1">
                {filteredProjects.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => selectProject(p)}
                    className={`group flex items-center gap-3 p-3 bg-white/35 border transition-all cursor-pointer rounded shadow-xs ${
                      selectedProject.id === p.id
                        ? 'border-gf-wood bg-white/70 shadow-sm'
                        : 'border-gf-tea/10 hover:border-gf-tea/30 hover:bg-white/45'
                    }`}
                  >
                    <div className="w-16 h-12 bg-gf-rice/30 border border-gf-tea/15 overflow-hidden shrink-0 rounded-sm">
                      {p.coverUrl ? (
                        <img
                          src={p.coverUrl}
                          alt={p.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          referrerPolicy="no-referrer"
                        />
                      ) : null}
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <h4 className="text-xs font-serif text-gf-wood font-semibold truncate text-left">{p.title}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[9px] font-mono text-gf-tea bg-gf-wood/5 px-1 rounded">{p.scale}</span>
                        <span className="text-[9px] font-mono text-gf-tea/80">已耗时 {p.timeSpent} 小时</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-8 border border-dashed border-gf-tea/30 my-4 bg-white/30 rounded">
          <span className="p-3 rounded-full bg-gf-sand/10 mb-3">
            <Layers className="w-6 h-6 text-gf-tea" />
          </span>
          <p className="text-gf-wood font-serif italic text-lg">在此视觉分区内暂无微型模型作品展示。</p>
          <button
            onClick={() => setSelectedCategory('All')}
            className="text-xs uppercase tracking-widest font-mono text-gf-wood mt-2 hover:underline cursor-pointer font-bold"
          >
            重置筛选条件
          </button>
        </div>
      )}

      {/* Editorial Footer */}
      <footer className="mt-8 flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-gf-tea/20 text-[9px] uppercase tracking-widest opacity-60 gap-3 text-gf-tea">
        <div>微缩模型造物学会 / The Miniature Society / 全球联展工艺</div>
        <div className="flex gap-4 md:gap-8 font-mono">
          <span>巴黎 Paris</span>
          <span>东京 Tokyo</span>
          <span>慕尼黑 Munich</span>
          <span>伦敦 London</span>
        </div>
      </footer>

      {/* Craftsman Signature Overlay Modal */}
      {activeCraftsmanName && (() => {
        const profile = craftsmenProfiles?.[activeCraftsmanName];
        const wechatId = profile?.wechatId || '';
        const wechatQr = profile?.wechatQr || '';
        const isSelectedQrForEdit = getIsSelected('craftsman-qr', { craftsmanName: activeCraftsmanName });

        const handleCopyCraftsmanWeChat = () => {
          if (!wechatId) return;
          navigator.clipboard.writeText(wechatId).then(() => {
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
          });
        };

        const handleInputChange = (val: string) => {
          setCraftsmanWechatIdInput(val);
          if (onUpdateCraftsmenProfiles) {
            const updated = {
              ...craftsmenProfiles,
              [activeCraftsmanName]: {
                name: activeCraftsmanName,
                wechatId: val,
                wechatQr: wechatQr // maintain QR
              }
            };
            onUpdateCraftsmenProfiles(updated);
          }
        };

        return (
          <div className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs flex items-center justify-center z-[100] p-4 animate-fade-in text-gf-wood font-sans">
            <div className="bg-gf-rice border border-gf-sand p-6 rounded shadow-2xl max-w-sm w-full relative space-y-4 text-left">
              <button
                type="button"
                onClick={() => {
                  setActiveCraftsmanName(null);
                  setIsCopied(false);
                }}
                className="absolute top-4 right-4 text-gf-tea hover:text-gf-wood transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="border-b border-gf-tea/20 pb-3">
                <span className="text-[10px] uppercase tracking-widest text-gf-tea block font-mono font-bold">筑造匠师团 Signature Panel</span>
                <h3 className="text-xl font-serif text-gf-wood font-bold mt-1">
                  印作：{activeCraftsmanName}
                </h3>
                <p className="text-[11px] text-gf-tea/80 mt-0.5 font-light">
                  本工坊入驻督造匠师 · 负责作品精密嵌合与结构督导
                </p>
              </div>

              {/* QR Code display area */}
              <div className="space-y-2">
                <span className="text-[9px] uppercase tracking-wider text-gf-wood font-mono block">
                  匠师专属联络印信 WeChat QR Code
                </span>

                <div 
                  onClick={() => {
                    if (isAdmin) {
                      handleSelectEditImage('craftsman-qr', { craftsmanName: activeCraftsmanName });
                    }
                  }}
                  className={`aspect-square w-44 mx-auto border rounded relative overflow-hidden flex flex-col items-center justify-center bg-white ${
                    isAdmin ? 'cursor-pointer hover:border-amber-500 hover:ring-2 hover:ring-amber-200' : ''
                  } ${
                    isSelectedQrForEdit ? 'border-amber-500 ring-4 ring-amber-400/30' : 'border-gf-tea/15'
                  }`}
                >
                  {wechatQr ? (
                    <img 
                      src={wechatQr} 
                      alt={`${activeCraftsmanName} 微信二维码`} 
                      className="w-full h-full object-contain p-2"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="text-center p-4">
                      <QrCode className="w-12 h-12 text-gf-tea/40 mx-auto mb-1" />
                      <span className="text-[10px] text-gf-tea/60 block font-mono">暂无二维码图片</span>
                    </div>
                  )}

                  {/* Admin overlays for craftsman qr edit */}
                  {isAdmin && (
                    <div className="absolute inset-x-0 bottom-0 bg-stone-900/95 text-[10px] text-gf-sand py-1 text-center font-sans tracking-wide">
                      {isSelectedQrForEdit ? '⚡ 请在此处拖放或 Ctrl+V' : '🎯 点击选择并拖放更换二维码'}
                    </div>
                  )}
                </div>

                {/* Local File Picker */}
                {isAdmin && (
                  <div className="flex justify-center pt-1.5">
                    <label className="flex items-center gap-1.5 px-3 py-1 bg-gf-wood hover:bg-stone-850 text-gf-rice hover:text-white rounded text-[10px] font-sans cursor-pointer transition-colors shadow-xs">
                      <Upload className="w-3.5 h-3.5" />
                      <span>选取本地印标/一键上传</span>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden" 
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            try {
                              const dataUrl = await compressImage(file, 0.15);
                              if (onUpdateCraftsmenProfiles) {
                                const updated = {
                                  ...craftsmenProfiles,
                                  [activeCraftsmanName]: {
                                    name: activeCraftsmanName,
                                    wechatId: wechatId,
                                    wechatQr: dataUrl
                                  }
                                };
                                onUpdateCraftsmenProfiles(updated);
                              }
                            } catch (err) {
                              console.error(err);
                            }
                          }
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* WeChat ID Field (Editable if admin) */}
              <div className="space-y-1">
                <span className="text-[9px] uppercase tracking-wider text-gf-wood font-mono block">
                  微信号 WeChat ID
                </span>
                {isAdmin ? (
                  <input
                    type="text"
                    value={craftsmanWechatIdInput}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="请输入匠师微信号 (例如: wechat_123)"
                    className="w-full px-2.5 py-1.5 bg-white border border-gf-tea/30 rounded text-xs text-gf-wood font-mono focus:outline-none focus:ring-1 focus:ring-gf-wood"
                  />
                ) : (
                  <div 
                    onClick={handleCopyCraftsmanWeChat}
                    className="p-2 border border-gf-tea/15 bg-white rounded flex items-center justify-between cursor-pointer hover:bg-gf-wood/5 transition-colors group"
                  >
                    <span className="text-sm font-bold font-mono text-gf-wood select-all truncate select-none">
                      {wechatId || '暂无微信号信息'}
                    </span>
                    {wechatId && (
                      <span className="text-[10px] text-gf-tea group-hover:text-gf-wood flex items-center gap-1 select-none">
                        {isCopied ? <Check className="w-3 h-3 text-emerald-600 animate-scale-up" /> : <Copy className="w-3.5 h-3.5" />}
                        <span className="font-sans text-[9px]">{isCopied ? '已复制' : '复制'}</span>
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="pt-2 text-center text-[10px] text-gf-tea/60 leading-relaxed font-sans">
                💡 {isAdmin ? '管理员在此项修改后的信息将自动同步并在稍后离线保存。' : '微理清风，匠心寄情。诚挚欢迎各位同道共同交流。'}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
