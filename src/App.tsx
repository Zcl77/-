/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { Project, Review, CraftsmanProfile, StudioSettings } from './types';
import { INITIAL_PROJECTS, INITIAL_REVIEWS } from './data';
import Sidebar from './components/Sidebar';
import GalleryView from './components/GalleryView';
import WIPTimeline from './components/WIPTimeline';
import CommissionForm from './components/CommissionForm'; // Repurposed for user rating comments
import AdminDashboard from './components/AdminDashboard';
import { motion, AnimatePresence } from 'motion/react';
import { db, loginWithGoogle, logoutFromGoogle, auth } from './firebase';
import { collection, onSnapshot, doc, setDoc, getDocs, writeBatch } from 'firebase/firestore';
import { compressImage } from './imageResizer';

export interface ImageEditContext {
  type: 'project-cover' | 'project-image' | 'room-cover' | 'room-image' | 'craftsman-qr' | 'master-qr';
  projectId?: string;
  imageIndex?: number;
  roomId?: string;
  craftsmanName?: string;
}

export default function App() {
  const [activeTab, setActiveTab] = useState<'gallery' | 'wip' | 'commission' | 'admin'>('gallery');
  const targetStyles = ['岭南市井烟火', '西洋折衷主义', '古典金石微刻', '水上水乡生态'];

  const [projects, setProjects] = useState<Project[]>(() => {
    const saved = localStorage.getItem('MINI_PORTFOLIO_PROJECTS_V2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(p => ({
            ...p,
            images: p.images || [],
            worksteps: p.worksteps || [],
            rooms: (p.rooms || []).map((r: any) => ({
              ...r,
              images: r.images || [],
              detailsList: r.detailsList || []
            })),
            authors: p.authors || []
          }));
        }
      } catch (e) {
        // Fallback
      }
    }
    localStorage.setItem('MINI_PORTFOLIO_PROJECTS_V2', JSON.stringify(INITIAL_PROJECTS));
    return INITIAL_PROJECTS;
  });

  const [reviews, setReviews] = useState<Review[]>(() => {
    const saved = localStorage.getItem('MINI_PORTFOLIO_REVIEWS_V2');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    localStorage.setItem('MINI_PORTFOLIO_REVIEWS_V2', JSON.stringify(INITIAL_REVIEWS));
    return INITIAL_REVIEWS;
  });

  const [categories, setCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('MINI_PORTFOLIO_CATEGORIES_V3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    localStorage.setItem('MINI_PORTFOLIO_CATEGORIES_V3', JSON.stringify(targetStyles));
    return targetStyles;
  });

  const [hiddenCategories, setHiddenCategories] = useState<string[]>(() => {
    const saved = localStorage.getItem('MINI_PORTFOLIO_HIDDEN_CATEGORIES_V3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // Fallback
      }
    }
    return [];
  });

  // Admin authentication
  const [isAdmin, setIsAdmin] = useState<boolean>(false);

  useEffect(() => {
    const unsub = auth.onAuthStateChanged(user => {
      if (user && user.emailVerified) {
        setIsAdmin(true);
        sessionStorage.setItem('MINI_PORTFOLIO_IS_ADMIN', 'true');
      } else {
        setIsAdmin(false);
        sessionStorage.removeItem('MINI_PORTFOLIO_IS_ADMIN');
      }
    });
    return () => unsub();
  }, []);

  // Craftsman profiles & overall studio settings
  const [craftsmenProfiles, setCraftsmenProfiles] = useState<Record<string, CraftsmanProfile>>(() => {
    const defaultCraftsmen: Record<string, CraftsmanProfile> = {
      '邓政松': { name: '邓政松', wechatId: 'dzs_micro' },
      '黄铭涛': { name: '黄铭涛', wechatId: 'hmt_craft' },
      '夏小军': { name: '夏小军', wechatId: 'xxj_minia' },
      '李泽楠': { name: '李泽楠', wechatId: 'lzn_studio' },
      '彭宇辰': { name: '彭宇辰', wechatId: 'pyc_crafts' },
      '郑钰玲': { name: '郑钰玲', wechatId: 'zyl_texture' },
      '赵忱璐': { name: '赵忱璐', wechatId: 'chenluzhao06' }
    };
    const saved = localStorage.getItem('MINI_PORTFOLIO_CRAFTSMEN_V1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return { ...defaultCraftsmen, ...parsed };
      } catch (e) {
        // Fallback
      }
    }
    localStorage.setItem('MINI_PORTFOLIO_CRAFTSMEN_V1', JSON.stringify(defaultCraftsmen));
    return defaultCraftsmen;
  });

  const [studioSettings, setStudioSettings] = useState<StudioSettings>(() => {
    const defaultSettings: StudioSettings = {
      wechatId: 'chenluzhao06',
      wechatQrUrl: ''
    };
    const saved = localStorage.getItem('MINI_PORTFOLIO_SETTINGS_V1');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return { ...defaultSettings, ...parsed };
      } catch (e) {
        // Fallback
      }
    }
    localStorage.setItem('MINI_PORTFOLIO_SETTINGS_V1', JSON.stringify(defaultSettings));
    return defaultSettings;
  });

  // Currently selected image frame context for edit replacement
  const [activeEditContext, setActiveEditContext] = useState<ImageEditContext | null>(null);

  // Subtle alert toast for block of download or copy
  const [blockAlert, setBlockAlert] = useState<string | null>(null);

  // Sync general settings changes
  const handleUpdateSettings = async (newSettings: StudioSettings) => {
    setStudioSettings(newSettings);
    try {
      await setDoc(doc(db, 'metadata', 'settings'), newSettings);
    } catch (e) { console.error(e); }
  };

  // Sync craftsman profiles changes
  const handleUpdateCraftsmenProfiles = async (newProfiles: Record<string, CraftsmanProfile>) => {
    setCraftsmenProfiles(newProfiles);
    try {
      await setDoc(doc(db, 'metadata', 'craftsmen'), { profiles: newProfiles });
    } catch (e) { console.error(e); }
  };

  // 2. Synchronize Project modifications immediately
  const handleUpdateProjects = async (newProjectsList: Project[]) => {
    const prevIds = new Set<string>(projects.map(p => p.id));
    const newIds = new Set<string>(newProjectsList.map(p => p.id));
    const removedIds = Array.from(prevIds).filter(id => !newIds.has(id));
    setProjects(newProjectsList);
    
    const sanitizeProject = (p: Project): Project => {
      const maxSize = 950000; // Skip individual huge base64 fields if they are nearly 1MB by themselves
      const sanitizeImage = (img: string | undefined) => (!img || img.length > maxSize) ? '' : img;
      
      return {
        ...p,
        coverUrl: sanitizeImage(p.coverUrl),
        images: (p.images || []).map(sanitizeImage),
        rooms: (p.rooms || []).map(r => ({ ...r, images: (r.images || []).map(sanitizeImage) })),
        worksteps: (p.worksteps || []).map(s => ({ ...s, image: sanitizeImage(s.image), images: (s.images || []).map(sanitizeImage) }))
      };
    };

    try {
      const batch = writeBatch(db);
      newProjectsList.forEach(p => {
        batch.set(doc(db, 'projects', String(p.id)), sanitizeProject(p));
      });
      removedIds.forEach(id => {
        batch.delete(doc(db, 'projects', String(id)));
      });
      await batch.commit();
    } catch (e) {
      console.error(e);
      // Fallback: try individual sets if batch still too big
      for (const p of newProjectsList) {
        try {
          await setDoc(doc(db, 'projects', String(p.id)), sanitizeProject(p));
        } catch (inner) {
          console.error(`Failed to save project ${p.id}: `, inner);
        }
      }
    }
  };

  // 3. Synchronize Categories modifications immediately
  const handleUpdateCategories = async (newCategoriesList: string[]) => {
    setCategories(newCategoriesList);
    try {
      await setDoc(doc(db, 'metadata', 'categories'), { list: newCategoriesList });
    } catch (e) { console.error(e); }
  };

  // 3.5. Synchronize Hidden Categories
  const handleUpdateHiddenCategories = async (newHiddenList: string[]) => {
    setHiddenCategories(newHiddenList);
    try {
      await setDoc(doc(db, 'metadata', 'hiddenCategories'), { list: newHiddenList });
    } catch (e) { console.error(e); }
  };

  // 4. Synchronize Reviews modifications immediately
  const handleUpdateReviews = async (newReviewsList: Review[]) => {
    const prevIds = new Set<string>(reviews.map(p => p.id));
    const newIds = new Set<string>(newReviewsList.map(p => p.id));
    const removedIds = Array.from(prevIds).filter(id => !newIds.has(id));
    setReviews(newReviewsList);
    try {
      const batch = writeBatch(db);
      newReviewsList.forEach(p => {
        batch.set(doc(db, 'reviews', String(p.id)), p);
      });
      removedIds.forEach(id => {
        batch.delete(doc(db, 'reviews', String(id)));
      });
      await batch.commit();
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    let unsubs: any[] = [];
    
    const setupListeners = async () => {
      unsubs.push(onSnapshot(collection(db, 'projects'), snap => {
        if (!snap.empty) {
          setProjects(snap.docs.map(d => ({ ...d.data(), id: d.id } as Project)));
        } else if (isAdmin) {
          // Bootstrap mode
          handleUpdateProjects(projects); // push local default list
        }
      }));
      unsubs.push(onSnapshot(collection(db, 'reviews'), snap => {
        if (!snap.empty) {
          setReviews(snap.docs.map(d => ({ ...d.data(), id: d.id } as Review)).sort((a,b)=> new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        } else if (isAdmin) {
          handleUpdateReviews(reviews);
        }
      }));
      unsubs.push(onSnapshot(doc(db, 'metadata', 'categories'), snap => {
        if (snap.exists() && snap.data().list) setCategories(snap.data().list);
        else if (isAdmin) handleUpdateCategories(categories);
      }));
      unsubs.push(onSnapshot(doc(db, 'metadata', 'hiddenCategories'), snap => {
        if (snap.exists() && snap.data().list) setHiddenCategories(snap.data().list);
      }));
      unsubs.push(onSnapshot(doc(db, 'metadata', 'craftsmen'), snap => {
        if (snap.exists() && snap.data().profiles) setCraftsmenProfiles(snap.data().profiles);
        else if (isAdmin) handleUpdateCraftsmenProfiles(craftsmenProfiles);
      }));
      unsubs.push(onSnapshot(doc(db, 'metadata', 'settings'), snap => {
        if (snap.exists()) setStudioSettings(snap.data() as StudioSettings);
        else if (isAdmin) handleUpdateSettings(studioSettings);
      }));
    };
    
    setupListeners();
    
    return () => {
      unsubs.forEach(fn => fn && fn());
    };
  }, [isAdmin]);

  // 5. Register user-submitted rating feedback
  const handleAddReview = async (newRev: Omit<Review, 'id' | 'createdAt'>) => {
    const reviewItem: Review = {
      ...newRev,
      id: `rev-${Date.now()}`,
      createdAt: new Date().toISOString()
    };

    // Optimistically update
    setReviews([reviewItem, ...reviews]);
    
    // Create explicitly in Firestore to not overwrite others
    try {
      await setDoc(doc(db, 'reviews', String(reviewItem.id)), reviewItem);
    } catch (e) { console.error(e); }
  };

  // Image editing updates using canvas base64 encoding from a Drag-and-drop or Paste file selection
  const updateImageByContext = (dataUrl: string, context: ImageEditContext) => {
    if (context.type === 'master-qr') {
      const updated = { ...studioSettings, wechatQrUrl: dataUrl };
      handleUpdateSettings(updated);
    } else if (context.type === 'craftsman-qr' && context.craftsmanName) {
      const updated = {
        ...craftsmenProfiles,
        [context.craftsmanName]: {
          ...craftsmenProfiles[context.craftsmanName],
          name: context.craftsmanName,
          wechatQr: dataUrl
        }
      };
      handleUpdateCraftsmenProfiles(updated);
    } else if (context.projectId) {
      const updatedProjects = projects.map(proj => {
        if (proj.id !== context.projectId) return proj;
        if (context.type === 'project-cover') {
          return { ...proj, coverUrl: dataUrl };
        } else if (context.type === 'project-image' && context.imageIndex !== undefined) {
          const newImages = [...proj.images];
          newImages[context.imageIndex] = dataUrl;
          return { ...proj, images: newImages };
        } else if (context.type === 'room-cover' && context.roomId) {
          const newRooms = (proj.rooms || []).map(r => {
            if (r.id === context.roomId) {
              return { ...r, coverUrl: dataUrl };
            }
            return r;
          });
          return { ...proj, rooms: newRooms };
        } else if (context.type === 'room-image' && context.roomId && context.imageIndex !== undefined) {
          const newRooms = (proj.rooms || []).map(r => {
            if (r.id === context.roomId) {
              const newRmImages = [...r.images];
              newRmImages[context.imageIndex] = dataUrl;
              return { ...r, images: newRmImages };
            }
            return r;
          });
          return { ...proj, rooms: newRooms };
        }
        return proj;
      });
      handleUpdateProjects(updatedProjects);
    }
  };

  const processImageFile = async (file: File, context: ImageEditContext) => {
    if (!file.type.startsWith('image/')) return;
    try {
      const dataUrl = await compressImage(file, 0.15); // Target ~150KB max
      updateImageByContext(dataUrl, context);
      setBlockAlert('✓ [图片更新成功] 已编录进作品储存库！');
      setTimeout(() => setBlockAlert(null), 3000);
    } catch (e) {
      console.error(e);
      setBlockAlert('❌ [图片更新失败] 处理出现问题。');
      setTimeout(() => setBlockAlert(null), 3000);
    }
  };

  // Protect tourist view from copy/download/drag-saving
  useEffect(() => {
    if (isAdmin) return;

    const showWarningToast = (message: string) => {
      setBlockAlert(message);
      const timer = setTimeout(() => setBlockAlert(null), 3000);
      return timer;
    };

    let toastTimer: any;

    const handleContextMenu = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('picture') || target.closest('.no-copy')) {
        e.preventDefault();
        clearTimeout(toastTimer);
        toastTimer = showWarningToast('🔒 [馆藏保全] 游客模式下禁止复制/下载杰作工艺图片及印信资料。');
      }
    };

    const handleDragStart = (e: DragEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'IMG' || target.closest('.no-copy')) {
        e.preventDefault();
        clearTimeout(toastTimer);
        toastTimer = showWarningToast('🔒 [馆藏保全] 馆藏图片为非卖展示，禁止拖动另存。');
      }
    };

    const handleCopy = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement;
      e.preventDefault();
      clearTimeout(toastTimer);
      toastTimer = showWarningToast('🔒 [内容保护] 馆藏文献及匠师个人信息已受数字水印保全。');
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Prevent common save keyboard combos (Ctrl+S, Command+S, etc.)
      if ((e.ctrlKey || e.metaKey) && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        clearTimeout(toastTimer);
        toastTimer = showWarningToast('🔒 [馆藏保全] 本工坊馆陈材料禁止另存。');
      }
    };

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('dragstart', handleDragStart);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('dragstart', handleDragStart);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('keydown', handleKeyDown);
      clearTimeout(toastTimer);
    };
  }, [isAdmin]);

  // Global paste and drop listeners when logged in as administrator and having an active selected frame
  useEffect(() => {
    if (!isAdmin || !activeEditContext) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const clipboardData = e.clipboardData;
      if (!clipboardData) return;
      
      const items = clipboardData.items;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file, activeEditContext);
            break;
          }
        }
      }
    };

    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault(); // Required for drop to trigger
    };

    const handleGlobalDrop = (e: DragEvent) => {
      const dataTransfer = e.dataTransfer;
      if (!dataTransfer) return;

      if (dataTransfer.files && dataTransfer.files.length > 0) {
        e.preventDefault();
        processImageFile(dataTransfer.files[0], activeEditContext);
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    window.addEventListener('dragover', handleGlobalDragOver);
    window.addEventListener('drop', handleGlobalDrop);

    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
      window.removeEventListener('dragover', handleGlobalDragOver);
      window.removeEventListener('drop', handleGlobalDrop);
    };
  }, [isAdmin, activeEditContext, projects, craftsmenProfiles, studioSettings]);

  const handleToggleAdminStatus = (status: boolean) => {
    setIsAdmin(status);
    if (status) {
      sessionStorage.setItem('MINI_PORTFOLIO_IS_ADMIN', 'true');
    } else {
      sessionStorage.removeItem('MINI_PORTFOLIO_IS_ADMIN');
      setActiveEditContext(null); // Reset highlighted frames
    }
  };

  const pendingCount = reviews.length; // Display total reviews count

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-gf-rice text-gf-wood font-sans selection:bg-gf-wood/20">
      {/* Sidebar navigation */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        pendingCommissionsCount={pendingCount}
      />

      {/* Viewport render container */}
      <div className="flex-1 h-screen relative bg-gf-rice">
        <AnimatePresence mode="wait">
          {activeTab === 'gallery' && (
            <motion.div
              key="gallery"
              initial={{ opacity: 0, scale: 0.90, filter: 'blur(10px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.95, filter: 'blur(5px)' }}
              transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
              className="absolute inset-0 w-full h-full origin-center"
            >
              {/* 微弱纸质纹理覆盖层 Paper texture overlay */}
              <div 
                className="pointer-events-none absolute inset-0 z-50 opacity-[0.04] mix-blend-multiply"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
              />
              <GalleryView 
                projects={projects} 
                categories={categories} 
                hiddenCategories={hiddenCategories} 
                isAdmin={isAdmin}
                activeEditContext={activeEditContext}
                setActiveEditContext={setActiveEditContext}
                craftsmenProfiles={craftsmenProfiles}
                onUpdateCraftsmenProfiles={handleUpdateCraftsmenProfiles}
              />
            </motion.div>
          )}

          {activeTab === 'wip' && (
            <motion.div
              key="wip"
              initial={{ opacity: 0, x: 20, filter: 'blur(2px)' }}
              animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, x: -20, filter: 'blur(2px)' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 w-full h-full"
            >
              <WIPTimeline projects={projects} />
            </motion.div>
          )}

          {activeTab === 'commission' && (
            <motion.div
              key="commission"
              initial={{ opacity: 0, y: 20, filter: 'blur(2px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              exit={{ opacity: 0, y: -20, filter: 'blur(2px)' }}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 w-full h-full"
            >
              <CommissionForm 
                onAddReview={handleAddReview} 
                projects={projects} 
                reviews={reviews} 
                studioSettings={studioSettings}
              />
            </motion.div>
          )}

          {activeTab === 'admin' && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, scale: 0.99, filter: 'blur(2px)' }}
              animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
              exit={{ opacity: 0, scale: 0.99, filter: 'blur(2px)' }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="absolute inset-0 w-full h-full"
            >
              <AdminDashboard
                projects={projects}
                reviews={reviews}
                categories={categories}
                hiddenCategories={hiddenCategories}
                onUpdateProjects={handleUpdateProjects}
                onUpdateReviews={handleUpdateReviews}
                onUpdateCategories={handleUpdateCategories}
                onUpdateHiddenCategories={handleUpdateHiddenCategories}
                isAdmin={isAdmin}
                onToggleAdminStatus={handleToggleAdminStatus}
                studioSettings={studioSettings}
                onUpdateSettings={handleUpdateSettings}
                craftsmenProfiles={craftsmenProfiles}
                onUpdateCraftsmenProfiles={handleUpdateCraftsmenProfiles}
                activeEditContext={activeEditContext}
                setActiveEditContext={setActiveEditContext}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Floating Banner warnings / confirmations */}
      {blockAlert && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-[200] px-5 py-3 bg-stone-900 border border-gf-sand/40 text-gf-rice text-xs md:text-sm rounded shadow-2xl font-serif flex items-center justify-center gap-2">
          {blockAlert}
        </div>
      )}

      {/* Active editable frame highlighted toast */}
      {isAdmin && activeEditContext && (
        <div className="fixed bottom-6 right-6 z-[180] max-w-sm p-4 bg-gf-wood text-gf-rice border border-gf-sand text-xs rounded shadow-2xl font-serif space-y-1.5 animate-pulse">
          <div className="flex justify-between items-center border-b border-gf-sand/20 pb-1.5">
            <span className="font-bold text-gf-sand uppercase tracking-wider text-[10px] flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 bg-gf-sand rounded-full animate-ping"></span>
              画布编辑中 Active Box
            </span>
            <button 
              onClick={() => setActiveEditContext(null)}
              className="text-[9px] uppercase tracking-wider text-gf-sand hover:underline cursor-pointer"
            >
              取消 [ESC]
            </button>
          </div>
          <p className="text-[11px] leading-relaxed opacity-90 text-left">
            当前已锁定一个可更替图片框。您可以直接将任意本地图片文件<strong>拖放至页面内</strong>，或者在系统剪贴板内复制图片后在此处按下键盘 <strong>Ctrl+V / Paste</strong> 即可瞬间完成数字更替。
          </p>
        </div>
      )}
    </div>
  );
}

