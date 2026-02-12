import { Link } from "react-router-dom";
import banklefyLogo from "@/assets/banklefy-logo.svg";

const Logo = () => {
  return (
    <Link
      to="/"
      aria-label="Banklefy home"
      className="flex items-center cursor-pointer group h-14 md:h-16"
    >
      {/* Logo Container */}
      <div className="relative w-10 h-10 md:w-12 md:h-12 flex items-center justify-center overflow-visible">
        <img
          src={banklefyLogo} 
          alt="Banklefy" 
          className="w-full h-full object-contain transition-all duration-500 group-hover:drop-shadow-[0_0_16px_rgba(255,255,255,0.25)] group-hover:scale-110"
        />
      </div>

      {/* Banklefy Text */}
      <span className="ml-2 text-lg md:text-xl font-black tracking-tighter bg-gradient-to-r from-[#FFFFFF] via-[#B5B5B5] to-[#717171] bg-clip-text text-transparent uppercase hidden sm:block drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] font-noir tracking-[0.02em]">
        Banklefy
      </span>
    </Link>
  );
};

export default Logo;
