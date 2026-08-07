import { useState, useEffect } from 'react';
import { Project, CraftsmanProfile, ImageEditContext } from '../types';
import DetailMagnifier from './DetailMagnifier';
import CraftsmanContactModal from './gallery/CraftsmanContactModal';
import GalleryProjectSidebar from './gallery/GalleryProjectSidebar';
import { 
  Layers, 
  CheckCircle2,
  Ruler,
  Box,
  CalendarDays,
  Compass,
  Users,
  Sparkles,
  Eye,
  Award,
  QrCode
} from 'lucide-react';

interface GalleryViewProps {
  projects: Project[];
  categories: string[];
  hiddenCategories?: string[];
  isAdmin?: boolean;
  activeEditContext?: ImageEditContext | null;
  setActiveEditContext?: (ctx: ImageEditContext | null) => void;
  craftsmenProfiles?: Record<string, CraftsmanProfile>;
  onUpdateCraftsmenProfiles?: (profiles: Record<string, CraftsmanProfile>) => Promise<void>;
  onUploadImage?: (file: File, context: ImageEditContext) => Promise<void>;
}

export default function GalleryView({ 
  projects, 
  categories, 
  hiddenCategories = [], 
  isAdmin = false,
  activeEditContext = null,
  setActiveEditContext,
  craftsmenProfiles = {},
  onUpdateCraftsmenProfiles,
  onUploadImage,
}: GalleryViewProps) {
  const [selectedCategory, setSelectedCategory] = useState<string | 'All'>('All');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [activeImage, setActiveImage] = useState<string>('');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Craftsman Popover / Modal state
  const [activeCraftsmanName, setActiveCraftsmanName] = useState<string | null>(null);
  const handleOpenCraftsmanModal = (name: string) => {
    setActiveCraftsmanName(name);
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

  return (
    <div className="flex-1 h-screen flex flex-col p-4 md:p-8 lg:p-12 macro-gradient overflow-y-auto">
      {/* Editorial Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-baseline mb-8 gap-4 border-b border-gf-wood/10 pb-6">
        <div className="flex flex-col text-left">
          <h1 className="text-3xl md:text-5xl font-serif text-gf-wood tracking-tight leading-none font-bold drop-shadow-sm">
            知行造境 <span className="text-gf-tea/60 font-serif italic text-2xl font-normal block md:inline md:ml-2">Zhixing Studio</span>
          </h1>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] mt-3 font-semibold text-gf-tea block opacity-80">
            {selectedProject ? `微缩建筑与场景制作 // ${selectedProject.category} // ${selectedProject.scale}` : '请选择一个作品分类'}
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

          <GalleryProjectSidebar
            selectedProject={selectedProject}
            projects={filteredProjects}
            selectedCategory={selectedCategory}
            onSelectProject={selectProject}
          />
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
        <div>知行造境 / Zhixing Studio</div>
        <div className="font-mono">微缩建筑与场景制作</div>
      </footer>

      {activeCraftsmanName && (
        <div key={activeCraftsmanName}>
          <CraftsmanContactModal
            name={activeCraftsmanName}
            profile={craftsmenProfiles[activeCraftsmanName]}
            profiles={craftsmenProfiles}
            isAdmin={isAdmin}
            isSelectedForEdit={getIsSelected('craftsman-qr', { craftsmanName: activeCraftsmanName })}
            onClose={() => setActiveCraftsmanName(null)}
            onSelectForEdit={() => handleSelectEditImage('craftsman-qr', { craftsmanName: activeCraftsmanName })}
            onUpdateProfiles={onUpdateCraftsmenProfiles}
            onUploadImage={onUploadImage}
          />
        </div>
      )}
    </div>
  );
}
