import { useNavigate } from "react-router-dom";
import amLogo from "@/assets/am-logo.png";

const Logo = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="flex items-center cursor-pointer group h-12" 
      onClick={() => navigate("/")}
    >
      {/* Logo Container - Isko tight rakha hai taaki layout na bigde */}
      <div className="relative w-16 h-16 flex items-center justify-center overflow-visible">
        <img 
          src={amLogo} 
          alt="Akromeda" 
          // '-mt-1' aur scale se logo upar-niche thoda bahar niklega par header nahi badhayega
          className="max-w-none h-[150%] w-auto object-contain transition-all duration-500 group-hover:drop-shadow-[0_0_15px_rgba(245,158,11,0.7)] group-hover:scale-110"
        />
      </div>

      {/* Akromeda Text - Size thoda kam kiya hai taaki balance rahe */}
      <span className="ml-4 text-xl md:text-2xl font-black tracking-tighter bg-gradient-to-r from-white via-white to-[#F59E0B] bg-clip-text text-transparent uppercase hidden sm:block">
        Akromeda
      </span>
    </div>
  );
};

export default Logo;