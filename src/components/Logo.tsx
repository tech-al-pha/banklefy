import { Link } from "react-router-dom";
import banklefyLogo from "@/assets/banklefy-logo-transparent.png";

const Logo = () => {
  return (
    <Link
      to="/"
      aria-label="Banklefy home"
      className="group flex h-9 sm:h-14 cursor-pointer items-center"
    >
      {/* Logo Container */}
      <div className="relative flex h-7 w-7 sm:h-12 sm:w-12 items-center justify-center overflow-visible">
        <img
          src={banklefyLogo} 
          alt="Banklefy" 
          className="banklefy-logo-mark w-full h-full object-contain transition-all duration-500 group-hover:drop-shadow-[0_0_16px_rgba(255,255,255,0.25)] group-hover:scale-110"
        />
      </div>

      {/* Banklefy Text */}
      <span className="ml-1 sm:ml-2 block bg-gradient-to-r from-[#FFFFFF] via-[#B5B5B5] to-[#717171] bg-clip-text text-sm sm:text-xl font-black uppercase tracking-[0.01em] sm:tracking-[0.02em] tracking-tighter text-transparent drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] font-noir">
        Banklefy
      </span>
    </Link>
  );
};

export default Logo;
