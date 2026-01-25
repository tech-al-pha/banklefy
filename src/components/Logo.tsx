import { useNavigate } from "react-router-dom";
import akromedaLogo from "@/assets/akromeda-logo.png";

const Logo = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="flex items-center cursor-pointer group h-14 md:h-16" 
      onClick={() => navigate("/")}
    >
      {/* Logo Container */}
      <div className="relative w-14 h-14 md:w-16 md:h-16 flex items-center justify-center overflow-visible">
        <img 
          src={akromedaLogo} 
          alt="Akromeda" 
          className="w-full h-full object-contain transition-all duration-500 group-hover:drop-shadow-[0_0_15px_rgba(245,158,11,0.7)] group-hover:scale-110"
        />
      </div>

      {/* Akromeda Text */}
      <span className="ml-3 text-xl md:text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-white to-[#F59E0B] bg-clip-text text-transparent uppercase hidden sm:block">
        Akromeda
      </span>
    </div>
  );
};

export default Logo;