import { useState, useRef } from "react";
import { Link } from "wouter";
import { useTenant } from "@/lib/tenant-context";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showEmojis?: boolean;
  asLink?: boolean;
  className?: string;
}

export function Logo({ 
  size = "md", 
  showEmojis = true, 
  asLink = true,
  className = ""
}: LogoProps) {
  const { tenant } = useTenant();
  const [showText, setShowText] = useState(false);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl"
  };
  
  const emojiContainerClasses = {
    sm: "ml-1",
    md: "ml-2",
    lg: "ml-3"
  };
  
  const emojiSizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl"
  };
  
  const handleMouseEnter = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    hoverTimeoutRef.current = setTimeout(() => {
      setShowText(true);
    }, 1500);
  };
  
  const handleMouseLeave = () => {
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    setShowText(false);
  };
  
  const LogoContent = (
    <div 
      className={`font-bold flex items-center ${sizeClasses[size]} ${className} group`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`${showText ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'} transition-all duration-200 ease-in-out overflow-hidden flex`}>
        <span className="text-gray-700 dark:text-gray-300">{tenant.branding.name}</span>
      </div>
      
      {showEmojis && (
        <div className={`flex items-end ${emojiContainerClasses[size]}`}>
          <span className={emojiSizeClasses[size]}>{tenant.branding.logoEmoji}</span>
        </div>
      )}
    </div>
  );
  
  // If logo should be a link, wrap in Link component
  // Links to tenant-configured authLanding route
  if (asLink) {
    return (
      <Link 
        href={tenant.routes.authLanding} 
        className="group hover:opacity-90 transition-opacity"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {LogoContent}
      </Link>
    );
  }
  
  // Otherwise just return the logo content
  return LogoContent;
}