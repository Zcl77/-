import React, { useState } from 'react';
import { Project, Review, StudioSettings } from '../types';
import { Star, MessageSquare, Award, Send, CheckCircle2, QrCode } from 'lucide-react';
import { REVIEW_LIMITS, validateReviewInput } from '../domain/validation';

interface CommissionFormProps {
  onAddReview: (review: { reviewerName: string; rating: number; projectName: string; comment: string }) => Promise<string>;
  projects: Project[];
  reviews: Review[];
  studioSettings?: StudioSettings;
}

export default function CommissionForm({ onAddReview, projects, reviews, studioSettings }: CommissionFormProps) {
  const [reviewerName, setReviewerName] = useState('');
  const [rating, setRating] = useState<number>(5);
  const [projectName, setProjectName] = useState('工作室总体打分');
  const [comment, setComment] = useState('');
  
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isCopied, setIsCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const wechatId = studioSettings?.wechatId.trim() ?? '';
  const wechatQrUrl = studioSettings?.wechatQrUrl;

  const handleCopyWeChat = async () => {
    if (!wechatId) return;
    try {
      await navigator.clipboard.writeText(wechatId);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setErrorMsg('复制失败，请手动选中微信号。');
    }
  };


  // Calculate rating stats
  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(2)
    : '—';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const input = {
      reviewerName: reviewerName.trim(),
      rating,
      projectName: projectName.trim(),
      comment: comment.trim(),
    };
    const errors = validateReviewInput(input);
    if (errors.length > 0) {
      setErrorMsg(errors[0]);
      return;
    }
    setIsSubmitting(true);
    try {
      await onAddReview(input);
      setIsSuccess(true);
      setReviewerName('');
      setComment('');
      setRating(5);
      setProjectName('工作室总体打分');
      setTimeout(() => setIsSuccess(false), 4000);
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : '提交失败，请稍后重试。');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingSubtitle = (val: number) => {
    switch (val) {
      case 5: return '🌟 殿堂神作 / Masterpiece';
      case 4: return '✨ 精彩绝伦 / Excellent';
      case 3: return '🎨 匠心独具 / Standard Craft';
      case 2: return '🛠️ 仍需雕琢 / Developing';
      case 1: return '📝 差强人意 / Needs Practice';
      default: return '';
    }
  };

  return (
    <div className="flex-1 h-screen flex flex-col p-4 md:p-8 lg:p-12 macro-gradient overflow-y-auto">
      {/* Editorial Header */}
      <header className="flex flex-col md:flex-row md:items-baseline justify-between mb-10 border-b border-gf-wood/20 pb-6 gap-4">
        <div className="flex flex-col text-left">
          <h1 id="rating-system-header" className="text-3xl md:text-5xl font-serif text-gf-wood tracking-tight leading-none font-bold">
            访客评鉴 <span className="text-gf-tea/60 font-serif italic text-2xl font-normal block md:inline md:ml-2">Visitor Reviews</span>
          </h1>
          <p className="text-[10px] md:text-xs uppercase tracking-[0.3em] mt-3 font-semibold text-gf-tea">
            公开评论均经工作室审核后展示
          </p>
        </div>
        
        {/* Statistics badge */}
        <div className="mt-4 md:mt-0 bg-white/75 border border-gf-tea/20 px-4 py-2.5 rounded flex items-center gap-4 shadow-sm self-start md:self-auto">
          <div className="text-left">
            <span className="text-[9px] uppercase tracking-wider font-mono text-gf-tea block font-bold">平均评鉴得分</span>
            <span className="text-2xl font-serif font-black text-gf-wood">{averageRating} <span className="text-xs text-gf-tea/60 font-sans font-normal">/ 5.0</span></span>
          </div>
          <div className="w-px h-8 bg-gf-tea/20" />
          <div className="text-left">
            <span className="text-[9px] uppercase tracking-wider font-mono text-gf-tea block font-bold">参评回数</span>
            <span className="text-2xl font-serif font-bold text-gf-wood block">{reviews.length} <span className="text-xs text-gf-tea/60 font-sans font-normal">次</span></span>
          </div>
        </div>
      </header>

      {/* Grid: Left column (Settle Form & Contact), Right column (Real-time Comments) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Aspect: Submit and Contact */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Official Statement Banner */}
          <div className="bg-white/60 border border-gf-tea/20 p-5 rounded relative overflow-hidden text-left shadow-xs">
            <div className="absolute top-0 right-0 w-16 h-16 bg-gf-sand/15 rotate-45 transform translate-x-8 -translate-y-8" />
            <div className="flex items-start gap-4 text-left">
              <Award className="w-6 h-6 text-gf-wood shrink-0 mt-0.5" />
              <div>
                <h3 className="text-sm font-semibold text-gf-wood font-serif mb-1 font-bold">
                  项目咨询与合作联络
                </h3>
                <p className="text-xs text-gf-wood/80 leading-relaxed text-left">
                  如需咨询建筑微缩、场景制作或项目合作，可通过下方工作室微信联系主理人。
                </p>
                
                {/* WeChat QR Card */}
                <button
                  type="button"
                  disabled={!wechatId}
                  onClick={() => void handleCopyWeChat()}
                  title={wechatId ? '点击复制微信号' : '尚未配置微信号'}
                  className="mt-4 w-full bg-white p-3 border border-gf-tea/15 rounded flex items-center gap-4 text-left enabled:cursor-pointer enabled:hover:border-gf-wood/50 disabled:opacity-70 transition-all shadow-xs"
                >
                  <div className="w-12 h-12 bg-gf-wood/5 border border-gf-tea/20 flex items-center justify-center rounded overflow-hidden select-none">
                    {wechatQrUrl ? (
                      <img 
                        src={wechatQrUrl} 
                        alt="主理人微信二维码" 
                        className="w-full h-full object-cover" 
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <QrCode className="w-8 h-8 text-gf-wood" />
                    )}
                  </div>
                  <div className="text-left font-mono flex-1 min-w-0">
                    <span className="text-[9px] uppercase tracking-wider text-gf-tea block font-bold">主理人微信 Contact</span>
                    <span className="text-sm font-bold text-gf-wood block select-all truncate">
                      {wechatId || '暂未配置'}
                    </span>
                    <span className="text-[8px] text-gf-tea block mt-0.5 font-light">
                      {!wechatId ? '请在后台联络设置中填写' : isCopied ? '复制成功' : '点击复制'}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Settle Score Form */}
          <div className="bg-white/40 border border-gf-tea/15 p-6 rounded text-left shadow-sm">
            <h3 className="text-sm font-serif tracking-wider text-gf-wood mb-4 border-b border-gf-tea/15 pb-2 font-bold">
              撰写并投递您的实时评分 Settle Score
            </h3>

            {errorMsg && (
              <div className="bg-red-50 border border-red-200 p-3 text-xs font-mono text-red-750 rounded mb-4 text-left">
                [警告 ALERT]: {errorMsg}
              </div>
            )}

            {isSuccess && (
              <div className="bg-emerald-50 border border-emerald-200 p-3 text-xs font-mono text-emerald-800 rounded mb-4 flex items-center gap-2 text-left">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 animate-bounce" />
                <span>提交成功。评论已进入待审核状态，批准后才会公开显示。</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              {/* Star interactive selection */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase tracking-widest text-gf-tea font-mono block font-bold">
                  评鉴星级 Star Rating *
                </label>
                <div className="flex items-center gap-2 py-2 text-left">
                  <div className="flex gap-1.5 justify-start">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoveredRating(star)}
                        onMouseLeave={() => setHoveredRating(null)}
                        className="p-1 hover:scale-125 transition-transform duration-200 cursor-pointer"
                      >
                        <Star
                          className={`w-7 h-7 transition-colors duration-150 ${
                            (hoveredRating !== null ? star <= hoveredRating : star <= rating)
                              ? 'fill-gf-wood text-gf-wood'
                              : 'text-stone-300 hover:text-gf-tea'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-xs font-serif text-gf-wood ml-2 transition-opacity duration-300 font-bold">
                    {getRatingSubtitle(hoveredRating !== null ? hoveredRating : rating)}
                  </span>
                </div>
              </div>

              {/* Target Project Dropdown */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase tracking-widest text-gf-tea font-mono block font-bold">
                  评鉴打分对象 Target Object
                </label>
                  <select
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  className="w-full bg-white text-stone-950 border border-gf-tea/35 p-2 text-sm rounded focus:ring-1 focus:ring-gf-wood focus:outline-none cursor-pointer font-sans hover:bg-amber-50 hover:border-gf-wood hover:text-stone-950 transition-all duration-200"
                >
                  <option value="工作室总体打分" className="bg-white text-stone-950 font-sans">工作室总体打分 (Overall Studio)</option>
                  {projects.map(proj => (
                    <option key={proj.id} value={proj.title} className="bg-white text-stone-950 font-sans">{proj.title}</option>
                  ))}
                </select>
              </div>

              {/* Reviewer Name */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase tracking-widest text-gf-tea font-mono block font-bold">
                  评鉴人大名/昵称 Name *
                </label>
                  <input
                  type="text"
                    required
                    maxLength={REVIEW_LIMITS.reviewerName}
                  placeholder="例如: 澄海老藏客 / 观展人小张"
                  value={reviewerName}
                  onChange={(e) => setReviewerName(e.target.value)}
                  className="w-full bg-white border border-gf-tea/35 p-2 text-sm text-gf-wood rounded focus:border-gf-wood focus:ring-1 focus:ring-gf-wood/50 focus:outline-none transition-colors"
                />
              </div>

              {/* Comment text area */}
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase tracking-widest text-gf-tea font-mono block font-bold">
                  评鉴观感与技艺点评 Comment *
                </label>
                  <textarea
                    required
                    maxLength={REVIEW_LIMITS.comment}
                  rows={4}
                  placeholder="说点什么吧，您觉得模型的墙皮旧化仿真度如何？暖光LED排线是否震撼？"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full bg-white border border-gf-tea/35 p-2 text-sm text-gf-wood rounded focus:border-gf-wood focus:ring-1 focus:ring-gf-wood/50 focus:outline-none transition-colors font-light text-left"
                />
              </div>

              {/* Submit trigger */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-2.5 bg-gf-wood hover:bg-gf-wood/90 text-gf-rice font-serif font-bold uppercase tracking-widest transition-all rounded duration-300 flex items-center justify-center gap-2 cursor-pointer shadow-sm disabled:opacity-50"
              >
                <Send className="w-3.5 h-3.5" />
                {isSubmitting ? '提交并等待确认' : '提交评鉴'}
              </button>
            </form>
          </div>
        </div>

        {/* Right Aspect: Real-time Comments Wall */}
        <div className="lg:col-span-7 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-gf-tea/20 pb-2">
            <h3 className="text-sm font-serif text-gf-wood font-bold flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-gf-wood" />
              已审核评论 ({reviews.length})
            </h3>
            <span className="text-[9px] uppercase tracking-widest font-mono text-gf-tea flex items-center gap-1.5 font-bold">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> 仅显示 approved
            </span>
          </div>

          <div className="space-y-4 max-h-[580px] overflow-y-auto pr-2 custom-scrollbar text-left">
            {reviews.length === 0 ? (
              <div className="text-center py-12 text-gf-tea font-light border border-dashed border-gf-tea/30 rounded bg-white/20">
                暂无评论，赶快做第一个打分评论人吧！
              </div>
            ) : (
              reviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white/50 border border-gf-tea/10 hover:border-gf-tea/20 hover:bg-white/80 p-4 rounded text-left transition-all relative group shadow-xs"
                >
                  <div className="flex items-start justify-between gap-4 text-left">
                    <div className="space-y-1 flex-1 text-left">
                      {/* Name & Target Object Badge */}
                      <div className="flex flex-wrap items-center gap-2 text-left">
                        <span className="text-xs font-semibold text-gf-wood group-hover:text-gf-wood/80 transition-colors font-serif font-bold">
                          {rev.reviewerName}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-gf-sand/15 text-gf-wood border border-gf-tea/10 rounded font-serif font-medium">
                          {rev.projectName}
                        </span>
                        {rev.isDemo && <span className="text-[9px] px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded">演示评论</span>}
                      </div>

                      {/* Comment text */}
                      <p className="text-xs text-gf-wood/95 leading-relaxed font-serif font-light mt-1.5 whitespace-pre-wrap text-left italic">
                        " {rev.comment} "
                      </p>
                    </div>

                    {/* Star array displaying score */}
                    <div className="flex flex-col items-end shrink-0 text-right">
                      <div className="flex gap-0.5 mb-1 text-gf-wood">
                        {Array.from({ length: 5 }).map((_, idx) => (
                          <Star
                            key={idx}
                            className={`w-3 h-3 ${idx < rev.rating ? 'fill-gf-wood text-gf-wood' : 'text-stone-200'}`}
                          />
                        ))}
                      </div>
                      <span className="text-[9px] text-gf-tea/80 font-mono">
                        {new Date(rev.createdAt).toLocaleString('zh-CN', {
                          month: '2-digit',
                          day: '2-digit',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
