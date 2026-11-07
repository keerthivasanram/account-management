import React, { useRef, useState } from 'react';

/**
 * FeatureCard3D
 * 
 * An elegant card with subtle 3D perspective tilt and dynamic specular light sheen on hover.
 */
export const FeatureCard3D = ({ icon: Icon, tag, title, description, badge, highlight }) => {
  const cardRef = useRef(null);
  const [style, setStyle] = useState({
    transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
    sheen: 'radial-gradient(circle at 50% 50%, rgba(22, 101, 52, 0) 0%, transparent 80%)',
  });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -6; // Max 6 deg tilt
    const rotateY = ((x - centerX) / centerX) * 6;

    const sheenX = (x / rect.width) * 100;
    const sheenY = (y / rect.height) * 100;

    setStyle({
      transform: `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`,
      sheen: `radial-gradient(circle at ${sheenX.toFixed(1)}% ${sheenY.toFixed(1)}%, rgba(22, 101, 52, 0.08) 0%, transparent 60%)`,
    });
  };

  const handleMouseEnter = () => setIsHovered(true);

  const handleMouseLeave = () => {
    setIsHovered(false);
    setStyle({
      transform: 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)',
      sheen: 'radial-gradient(circle at 50% 50%, rgba(22, 101, 52, 0) 0%, transparent 80%)',
    });
  };

  return (
    <div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: style.transform,
        transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
      }}
      className={`relative rounded-xl border bg-white p-6 sm:p-7 shadow-xs transition-shadow duration-300 overflow-hidden ${
        highlight 
          ? 'border-[#166534]/30 shadow-md ring-1 ring-[#166534]/15' 
          : 'border-slate-200/90 hover:border-slate-300 hover:shadow-md'
      }`}
    >
      {/* Dynamic specular light sheen */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background: style.sheen,
          opacity: isHovered ? 1 : 0,
        }}
      />

      {/* Card Content */}
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="h-10 w-10 rounded-lg bg-[#166534]/10 text-[#166534] flex items-center justify-center">
              {Icon && <Icon className="h-5 w-5" />}
            </div>
            {badge && (
              <span className="text-[10px] font-semibold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                {badge}
              </span>
            )}
          </div>

          {tag && (
            <p className="text-[11px] font-semibold text-[#166534] uppercase tracking-wider mb-1">
              {tag}
            </p>
          )}

          <h3 className="text-base font-semibold text-[#172B24] tracking-tight mb-2">
            {title}
          </h3>

          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            {description}
          </p>
        </div>

        <div className="pt-4 mt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-medium">
          <span>Enterprise SLA</span>
          <span className="text-[#166534] font-semibold">Active & Governed</span>
        </div>
      </div>
    </div>
  );
};

export default FeatureCard3D;
