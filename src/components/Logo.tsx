import { Link } from "react-router-dom";
import banklefyLogo from "@/assets/banklefy-logo.svg";

const Logo = () => {
  return (
    <Link
      to="/"
      aria-label="Banklefy home"
      className="group flex h-16 md:h-20 cursor-pointer items-center"
    >
      {/* Logo Container */}
      <div className="relative flex h-12 w-12 md:h-14 md:w-14 items-center justify-center overflow-visible">
        <img
          src={banklefyLogo} 
          alt="Banklefy" 
          className="w-full h-full object-contain transition-all duration-500 group-hover:drop-shadow-[0_0_16px_rgba(255,255,255,0.25)] group-hover:scale-110"
        />
      </div>

      {/* Banklefy Text */}
      <span className="ml-2 block bg-gradient-to-r from-[#FFFFFF] via-[#B5B5B5] to-[#717171] bg-clip-text text-xl md:text-2xl font-black uppercase tracking-[0.02em] tracking-tighter text-transparent drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)] font-noir">
        Banklefy
      </span>
    </Link>
  );
};

export default Logo;
