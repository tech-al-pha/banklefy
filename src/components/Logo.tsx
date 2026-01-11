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
        className="h-14 w-auto transition-all duration-500 group-hover:drop-shadow-[0_0_20px_hsl(215_100%_50%/0.7)] group-hover:scale-105"
      />
    </div>
  );
};

export default Logo;
