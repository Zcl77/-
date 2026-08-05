import { Wrench, Layers, Star, HardHat } from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  activeTab: 'gallery' | 'wip' | 'commission' | 'admin';
  setActiveTab: (tab: 'gallery' | 'wip' | 'commission' | 'admin') => void;
  pendingCommissionsCount: number;
}

export default function Sidebar({
  activeTab,
  setActiveTab,
  pendingCommissionsCount
}: SidebarProps) {
  return (
    <aside className="w-20 md:w-24 h-screen border-r border-gf-tea/20 flex flex-col items-center py-8 justify-between bg-gf-wood select-none shrink-0 z-50">
      {/* Top Brand Monogram */}
      <div 
        onClick={() => setActiveTab('gallery')}
        className="cursor-pointer group flex flex-col items-center gap-1"
      >
        <motion.div 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="w-12 h-12 bg-gf-rice flex items-center justify-center transition-colors duration-300 group-hover:bg-gf-sand rounded-sm premium-shadow"
        >
          <span className="text-gf-wood font-serif font-black text-2xl transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:rotate-180">C</span>
        </motion.div>
        <span className="text-[9px] uppercase tracking-widest font-mono text-gf-rice/60 mt-1">工作室</span>
      </div>

      {/* Decorative vertical lettering */}
      <div className="hidden md:block vertical-text text-[9px] uppercase tracking-[0.45em] font-light text-gf-rice/40 whitespace-nowrap font-serif italic">
        创立于 MMXXIV
      </div>

      {/* Primary Vertical Navigation and quick tabs */}
      <nav className="flex flex-col gap-6 items-center w-full px-2">
        <motion.button
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setActiveTab('gallery')}
          className={`group flex flex-col items-center justify-center p-2 rounded transition-colors w-full cursor-pointer relative ${
            activeTab === 'gallery' ? 'text-gf-rice font-medium' : 'text-gf-rice/50 hover:text-gf-rice/90'
          }`}
          title="作品展示艺廊"
        >
          {activeTab === 'gallery' && (
             <motion.div layoutId="active-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gf-sand rounded-r-sm" transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.4 }} />
          )}
          <Layers className={`w-5 h-5 mb-1 transition-transform duration-300 group-hover:scale-110 ${activeTab === 'gallery' ? 'text-gf-sand' : ''}`} />
          <span className="text-[10px] tracking-wider font-light">展示艺廊</span>
        </motion.button>

        <motion.button
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setActiveTab('wip')}
          className={`group flex flex-col items-center justify-center p-2 rounded transition-colors w-full cursor-pointer relative ${
            activeTab === 'wip' ? 'text-gf-rice font-medium' : 'text-gf-rice/50 hover:text-gf-rice/90'
          }`}
          title="进行中的作品及时间线"
        >
          {activeTab === 'wip' && (
             <motion.div layoutId="active-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gf-sand rounded-r-sm" transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.4 }} />
          )}
          <Wrench className={`w-5 h-5 mb-1 transition-transform duration-300 group-hover:scale-110 ${activeTab === 'wip' ? 'text-gf-sand' : ''}`} />
          <span className="text-[10px] tracking-wider font-light">研制进度</span>
        </motion.button>

        <motion.button
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setActiveTab('commission')}
          className={`group flex flex-col items-center justify-center p-2 rounded transition-colors w-full cursor-pointer relative ${
            activeTab === 'commission' ? 'text-gf-rice font-medium' : 'text-gf-rice/50 hover:text-gf-rice/90'
          }`}
          title="在线观众实时评论与评分系统"
        >
           {activeTab === 'commission' && (
             <motion.div layoutId="active-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gf-sand rounded-r-sm" transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.4 }} />
          )}
          <Star className={`w-5 h-5 mb-1 transition-transform duration-300 group-hover:scale-110 ${activeTab === 'commission' ? 'text-gf-sand' : 'text-gf-sand/60'}`} />
          <span className="text-[10px] tracking-wider font-light">实时打分</span>
        </motion.button>

        <div className="w-8 h-px bg-gf-rice/10 my-1"></div>

        <motion.button
          whileHover={{ x: 3 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setActiveTab('admin')}
          className={`group flex flex-col items-center justify-center p-2 rounded transition-colors w-full cursor-pointer relative ${
            activeTab === 'admin' ? 'text-gf-sand font-semibold bg-gf-rice/5' : 'text-gf-rice/40 hover:text-gf-rice/90'
          }`}
          title="工作室后台管理中心"
        >
           {activeTab === 'admin' && (
             <motion.div layoutId="active-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gf-sand rounded-r-sm" transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.4 }} />
          )}
          <HardHat className="w-5 h-5 mb-1 transition-transform duration-300 group-hover:scale-110" />
          <span className="text-[10px] tracking-wider font-light text-center">工作台</span>
          {pendingCommissionsCount > 0 && (
            <span className="absolute top-1 right-2 bg-gf-sand text-gf-wood text-[9px] font-bold w-4.5 h-4.5 flex items-center justify-center rounded-full border border-gf-wood/30 shadow animate-pulse">
              {pendingCommissionsCount}
            </span>
          )}
        </motion.button>
      </nav>

      {/* Bottom vertical tag */}
      <div className="hidden md:block vertical-text text-[9px] uppercase tracking-[0.45em] font-light text-gf-rice/40 whitespace-nowrap font-serif">
        微型与微缩模型工艺
      </div>
    </aside>
  );
}
