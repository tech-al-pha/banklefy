import { useNavigate } from "react-router-dom";

const Logo = () => {
  const navigate = useNavigate();

  return (
    <div 
      className="flex items-center gap-3 cursor-pointer group"
      onClick={() => navigate("/")}
    >
      <div className="w-10 h-10 transition-all duration-300 group-hover:drop-shadow-[0_0_8px_hsl(var(--secondary))]">
        <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="12" cy="12" r="10" stroke="hsl(var(--secondary))" strokeWidth="1.5"/>
          <path 
            d="M12 2V22M2 12H22M12 2C14.5 4.5 16 8 16 12C16 16 14.5 19.5 12 22M12 2C9.5 4.5 8 8 8 12C8 16 9.5 19.5 12 22" 
            stroke="hsl(var(--secondary))" 
            strokeWidth="1.5"
          />
        </svg>
      </div>
      <span className="font-bold text-[28px] tracking-tight text-foreground uppercase">
        AM
      </span>
    </div>
  );
};

export default Logo;
