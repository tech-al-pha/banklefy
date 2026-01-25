import { useNavigate } from "react-router-dom";
import akromedaLogo from "@/assets/akromeda-logo.png";

const Logo = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="flex items-center cursor-pointer group h-16 md:h-20" 
      onClick={() => navigate("/")}
    >
      {/* Logo Container */}
      <div className="relative w-16 h-16 md:w-20 md:h-20 flex items-center justify-center overflow-visible">
        <img 
          src={akromedaLogo} 
          alt="Akromeda" 
          className="w-full h-full object-contain transition-all duration-500 group-hover:drop-shadow-[0_0_15px_rgba(245,158,11,0.7)] group-hover:scale-110"
        />
      </div>

      {/* Akromeda Text - closer to logo with ml-1 */}
      <span className="ml-1 text-2xl md:text-3xl font-black tracking-tighter bg-gradient-to-r from-white via-white to-[#F59E0B] bg-clip-text text-transparent uppercase hidden sm:block">
        Akromeda
      </span>
    </div>
  );
};

export default Logo;