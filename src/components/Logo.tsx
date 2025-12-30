import { useNavigate } from "react-router-dom";
import amLogo from "@/assets/am-logo.png";

const Logo = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="cursor-pointer group"
      onClick={() => navigate("/")}
    >
      <img 
        src={amLogo} 
        alt="Akromeda" 
        className="h-12 w-auto transition-all duration-300 group-hover:drop-shadow-[0_0_12px_hsl(var(--primary)/0.6)]"
      />
    </div>
  );
};

export default Logo;
