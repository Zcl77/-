import { useState } from 'react';
import { Project } from '../types';
import { Hammer, CircleDollarSign, Compass, Calendar, Sparkles, TrendingUp, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface WIPTimelineProps {
  projects: Project[];
}

export default function WIPTimeline({ projects }: WIPTimelineProps) {
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Prefer WIP projects first, then completed ones
  const sortedProjects = [...projects].sort((a, b) => {
    if (a.status === 'WIP' && b.status !== 'WIP') return -1;
    if (a.status !== 'WIP' && b.status === 'WIP') return 1;
    return b.timeSpent - a.timeSpent;
  });

  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    sortedProjects.length > 0 ? sortedProjects[0].id : ''
  );

  const selectedProject = projects.find(p => p.id === selectedProjectId);

  const statusTranslations: Record<string, string> = {
    'WIP': '精研推进中 (WIP)',
    'Completed': '大功告成',
    'Sold': '已被藏家高远奉收'
  };

  return (
    <div className="flex-1 h-screen flex flex-col p-4 md:p-8 lg:p-12 macro-gradient overflow-y-auto">
      {/* Header */}
      <header className="flex justify-between items-baseline mb-12 border-b border-gf-wood/20 pb-6 text-left">
        <div className="flex flex-col text-left">
          <h1 className="text-3xl md:text-5xl font-serif text-gf-wood tracking-tight leading-none font-bold text-left drop-shadow-sm">
            造物考工记 <span className="text-gf-tea/60 font-serif italic text-2xl font-normal block md:inline md:ml-2">Evolution Log</span>
          </h1>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] mt-3 font-semibold text-gf-tea text-left block opacity-80">
            进行中模型研制进度时间线 / 素造 • 精雕 • 漆画 • 旧化考工
          </p>
        </div>
      </header>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Selectable WIP Projects (3 in 12) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <h3 className="text-[10px] uppercase tracking-[0.2em] text-gf-tea font-mono font-bold mb-1 text-left">
            在研匠心项目库 PROJECT ENGINE CORES
          </h3>
          
          <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gf-tea/30 scrollbar-track-transparent">
            {sortedProjects.map((proj, idx) => (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: idx * 0.1, ease: "easeOut" }}
                key={proj.id}
                onClick={() => setSelectedProjectId(proj.id)}
                className={`p-4 soft-glass transition-all duration-300 ease-out cursor-pointer rounded text-left relative overflow-hidden group ${
                  selectedProjectId === proj.id
                    ? 'premium-shadow border-gf-wood/50 bg-white/60'
                    : 'border-gf-tea/10 hover:premium-shadow hover:border-gf-tea/30 hover:bg-white/50'
                }`}
              >
                {selectedProjectId === proj.id && (
                  <motion.div layoutId="wipIndicator" className="absolute left-0 top-0 bottom-0 w-1 bg-gf-wood mix-blend-multiply" />
                )}
                
                <div className="flex justify-between items-start mb-2 relative z-10 pl-2">
                  <h4 className="text-[15px] font-serif text-gf-wood font-extrabold text-left leading-relaxed">{proj.title}</h4>
                  <span className={`text-[8px] font-mono font-bold tracking-wider px-2 py-0.5 rounded shadow-sm ${
                    proj.status === 'WIP' ? 'bg-gf-wood text-gf-sand' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {statusTranslations[proj.status] || proj.status}
                  </span>
                </div>
                
                {/* Micro progress line */}
                <div className="mt-4 pt-3 border-t border-gf-tea/15 flex justify-between items-center text-[10px] text-gf-tea relative z-10 pl-2">
                  <span className="font-serif text-left font-semibold">{proj.scale} • {proj.category}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-gf-wood font-medium">{proj.completionPercent}%</span>
                    <div className="w-16 h-[3px] bg-gf-wood/15 rounded-full overflow-hidden shadow-inner">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${proj.completionPercent}%` }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                        className="h-full bg-gf-wood rounded-full" 
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Theoretical notes */}
          <div className="p-5 mt-2 bg-gradient-to-br from-gf-wood/5 to-gf-rice/30 border border-gf-tea/20 rounded shadow-inner text-xs leading-relaxed text-gf-wood text-left font-serif">
            <h4 className="font-bold uppercase tracking-wider mb-2 flex items-center gap-1.5 opacity-90">
              <Sparkles className="w-4 h-4 text-gf-wood" /> 模型制作工艺要解 Technique Note
            </h4>
            <p className="font-light opacity-80 leading-loose">
              微型景观重工工序均由多层手绘画胶、微缩拼插骨架、定制灰泥纹理、国画漆色擦洗洗渍以及超精细天然色粉尘埃风化等，历经千百工时琢磨而成，非纯机械量产品所能企及。
            </p>
          </div>
        </div>

        {/* Right Side: Render Visual Timeline (8 in 12) */}
        <div className="lg:col-span-8 relative h-[calc(100vh-180px)] overflow-hidden">
          <AnimatePresence mode="wait">
            {selectedProject ? (
              <motion.div
                key={selectedProject.id}
                initial={{ opacity: 0, x: 20, filter: 'blur(4px)' }}
                animate={{ opacity: 1, x: 0, filter: 'blur(0px)' }}
                exit={{ opacity: 0, x: -20, filter: 'blur(4px)' }}
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="bg-white/50 soft-glass premium-shadow border border-gf-tea/15 p-6 md:p-8 rounded space-y-8 text-left h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gf-tea/30 scrollbar-track-transparent"
              >
                {/* Active Selection Details */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gf-tea/15 pb-6">
                  <div className="text-left">
                    <span className="text-[10px] uppercase tracking-widest font-mono text-gf-tea block mb-1 font-bold">
                      当前查看研制历程 CORE TIMELINE
                    </span>
                    <h2 className="text-2xl md:text-3xl font-serif font-bold text-gf-wood drop-shadow-sm">{selectedProject.title}</h2>
                    <p className="text-xs text-gf-tea/90 mt-1 max-w-xl leading-relaxed text-left">{selectedProject.description}</p>
                  </div>
                  
                  <motion.div 
                    whileHover={{ scale: 1.05 }}
                    className="bg-white/70 p-4 rounded border border-gf-tea/20 text-center shrink-0 min-w-[120px] shadow-sm premium-shadow cursor-default"
                  >
                    <span className="text-[9px] uppercase tracking-widest text-gf-tea block mb-1 font-semibold">督造累计工时</span>
                    <div className="flex items-center justify-center gap-1 mt-0.5 text-gf-wood">
                      <TrendingUp className="w-4 h-4 text-gf-wood" />
                      <span className="text-xl font-bold font-mono">{selectedProject.timeSpent} 小时</span>
                    </div>
                    <span className="text-[8px] font-mono text-gf-tea/65 uppercase tracking-tighter block mt-0.5">ESTIMATED TIMER</span>
                  </motion.div>
                </div>

                {/* Progress Bar Display */}
                <div className="text-left">
                  <div className="flex justify-between items-baseline mb-2 text-left">
                    <span className="text-[10px] uppercase tracking-widest font-mono text-gf-tea font-bold">整机零部件装配与着色漆面进度</span>
                    <span className="text-xs font-mono font-bold text-gf-wood">已完成 {selectedProject.completionPercent}%</span>
                  </div>
                  <div className="w-full h-2.5 bg-gf-wood/10 rounded-full overflow-hidden shadow-inner">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedProject.completionPercent}%` }}
                      transition={{ duration: 1.2, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
                      className="h-full bg-gf-wood relative"
                    >
                      <div className="absolute right-0 top-0 bottom-0 w-2 bg-gf-sand animate-pulse"></div>
                    </motion.div>
                  </div>
                </div>

                {/* Vertical Chrono-Track */}
                <div className="relative pl-6 sm:pl-8 border-l border-gf-tea/25 py-2 space-y-8 text-left">
                  {selectedProject.worksteps && selectedProject.worksteps.length > 0 ? (
                    selectedProject.worksteps.map((step, idx) => {
                      const isDone = step.status === 'DONE';
                      const isActive = step.status === 'ACTIVE';

                      return (
                        <motion.div 
                          key={step.id} 
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.5, delay: 0.2 + idx * 0.1, ease: "easeOut" }}
                          className="relative group text-left"
                        >
                          {/* Circle Bullet Badge centered on border */}
                          <div className={`absolute -left-[31px] sm:-left-[39px] top-1.5 w-4 h-4 rounded-full border-2 transition-all duration-300 flex items-center justify-center ${
                            isDone 
                              ? 'bg-emerald-600 border-emerald-600 shadow-[0_0_8px_rgba(16,185,129,0.3)]'
                              : isActive
                              ? 'bg-gf-wood border-gf-wood animate-pulse shadow-[0_0_12px_rgba(102,50,28,0.4)]'
                              : 'bg-gf-rice border-gf-tea/35'
                          }`}>
                            {isDone ? (
                              <span className="text-[8px] text-gf-rice font-bold font-mono">✓</span>
                            ) : isActive ? (
                              <span className="w-1.5 h-1.5 bg-gf-sand rounded-full"></span>
                            ) : (
                              <span className="text-[8px] text-gf-tea/60 font-bold font-mono">{idx + 1}</span>
                            )}
                          </div>

                          {/* Card Container */}
                          <motion.div 
                            whileHover={{ y: -2 }}
                            className={`p-5 border transition-all duration-300 rounded text-left ${
                              isActive 
                                ? 'bg-gf-sand/10 border-gf-wood/50 premium-shadow'
                                : 'bg-white/50 soft-glass border-gf-tea/10 hover:border-gf-tea/20 hover:premium-shadow hover:bg-white/80'
                            }`}
                          >
                          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-2 text-left">
                            <h3 className={`text-sm tracking-wide font-serif font-bold ${isActive ? 'text-gf-wood' : 'text-gf-wood/90'}`}>
                              {step.name}
                            </h3>
                            
                            <span className={`text-[8px] font-mono font-bold tracking-widest px-2 py-0.5 rounded uppercase ${
                              isDone
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-250'
                                : isActive
                                ? 'bg-gf-wood text-gf-sand font-semibold'
                                : 'text-gf-tea border border-gf-tea/20 bg-white/20'
                            }`}>
                              {step.status === 'DONE' ? '已镌定' : step.status === 'ACTIVE' ? '精工进行' : '待刻期'}
                            </span>
                          </div>

                          {step.detail && (
                            <p className="text-xs text-gf-wood/80 leading-relaxed max-w-2xl font-light text-left">
                              {step.detail}
                            </p>
                          )}

                          {/* Process images gallery/grid */}
                          {(() => {
                            const allStepImages = [
                              ...(step.image ? [step.image] : []),
                              ...(step.images ? step.images : [])
                            ].filter((url, idx, self) => url && self.indexOf(url) === idx);

                            if (allStepImages.length === 0) return null;

                            return (
                              <div className="mt-4">
                                <span className="text-[9px] uppercase tracking-wider text-gf-tea/80 font-mono block mb-1.5 font-bold">
                                  📸 制作过程图 (Process Snaps - 点击放大预览):
                                </span>
                                {allStepImages.length === 1 ? (
                                  <div 
                                    onClick={() => setLightboxImage(allStepImages[0])}
                                    className="max-w-md aspect-video border border-gf-tea/25 rounded overflow-hidden shadow-xs bg-black/5 relative group/img cursor-zoom-in"
                                  >
                                    <img 
                                      src={allStepImages[0]} 
                                      alt={step.name} 
                                      className="w-full h-full object-cover transition-transform duration-500 group-hover/img:scale-105"
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="absolute top-2 left-2 bg-gf-wood text-gf-sand text-[8px] tracking-widest font-mono px-2 py-0.5 rounded shadow-sm">
                                      单图实况 Process Snap
                                    </div>
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-w-2xl">
                                    {allStepImages.map((imgUrl, imgIdx) => (
                                      <div
                                        key={imgIdx}
                                        onClick={() => setLightboxImage(imgUrl)}
                                        className="aspect-video border border-gf-tea/20 rounded overflow-hidden shadow-xs bg-black/5 relative group/img cursor-zoom-in hover:border-gf-wood hover:shadow-sm transition-all"
                                      >
                                        <img 
                                          src={imgUrl} 
                                          alt={`${step.name} - ${imgIdx}`} 
                                          className="w-full h-full object-cover transition-transform duration-350 group-hover/img:scale-110"
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="absolute bottom-1 right-1 bg-black/70 text-white text-[7px] font-mono px-1.5 py-0.5 rounded">
                                          #{imgIdx + 1}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })()}
                        </motion.div>
                      </motion.div>
                    );
                  })
                ) : (
                  <div className="text-xs text-gf-tea font-mono italic text-left">
                    暂无本微缩模型项目的分项工期纪实。
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div 
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="h-48 border border-dashed border-gf-tea/30 bg-white/20 flex items-center justify-center rounded premium-shadow"
              >
                <span className="text-sm font-mono text-gf-tea">请选择一个左侧的工艺营造日志以查看详情。</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Lightbox full-size image preview */}
      {lightboxImage && (
        <div 
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-xs flex items-center justify-center p-4 cursor-zoom-out"
          onClick={() => setLightboxImage(null)}
        >
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={() => setLightboxImage(null)}
              className="p-2.5 bg-zinc-950 hover:bg-zinc-900 text-white rounded-full border border-white/10 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="relative max-w-4xl max-h-[85vh] rounded-md overflow-hidden bg-zinc-950 border border-white/5 shadow-2xl">
            <img 
              src={lightboxImage} 
              alt="Process Zoomed Snap" 
              className="w-auto max-h-[85vh] object-contain mx-auto"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}
    </div>
  );
}
