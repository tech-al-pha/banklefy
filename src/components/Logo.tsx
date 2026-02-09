import { Link } from "react-router-dom";
import akromedaLogo from "@/assets/akromeda-logo.png";

const Logo = () => {
  return (
    <Link
      to="/"
      aria-label="Akromeda home"
      className="flex items-center cursor-pointer group h-14 md:h-16"
    >
      {/* Logo Container */}
      <div className="relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center overflow-visible">
        <img
          src={akromedaLogo} 
          alt="Akromeda" 
          className="w-full h-full object-contain transition-all duration-500 group-hover:drop-shadow-[0_0_16px_rgba(176,123,58,0.7)] group-hover:scale-110"
        />
      </div>

      {/* Akromeda Text */}
      <span className="ml-3 text-xl md:text-2xl font-black tracking-tighter bg-gradient-to-r from-[#f7efe6] via-[#d9b373] to-[#b07b3a] bg-clip-text text-transparent uppercase hidden sm:block drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]">
        Akromeda
      </span>
    </Link>
  );
};

export default Logo;
