import { ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useLanguage, languageNames } from '@/contexts/LanguageContext';
import { activeLanguages, availableLanguages } from '@/contexts/languageData';

export const LanguageSelector = () => {
  const { language, setLanguage } = useLanguage();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm" 
          className="text-sm gap-1 text-muted-foreground transition-all duration-300"
        >
          {languageNames[language]}
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="bg-background/95 backdrop-blur-lg border-primary/20">
        {availableLanguages.map((lang) => {
          const isActive = activeLanguages.includes(lang);
          return (
          <DropdownMenuItem
            key={lang}
            onClick={() => isActive && setLanguage(lang)}
            disabled={!isActive}
            className={`cursor-pointer ${language === lang ? 'text-primary font-semibold' : 'text-foreground'} ${!isActive ? 'opacity-60' : ''}`}
          >
            <div className="flex w-full items-center justify-between gap-3">
              <span>{languageNames[lang]}</span>
              {!isActive && (
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Coming Soon</span>
              )}
            </div>
          </DropdownMenuItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
