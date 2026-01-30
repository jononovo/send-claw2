import React, { useState, useRef } from "react";
import { Link } from "wouter";

interface LogoProps {
  // Size variant options
  size?: "sm" | "md" | "lg";
  // Whether to include emojis
  showEmojis?: boolean;
  // Whether to make it a link to home
  asLink?: boolean;
  // Optional additional className
  className?: string;
}

export function Logo({ 
  size = "md", 
  showEmojis = true, 
  asLink = true,
  className = ""
}: LogoProps) {
  // State to control text visibility
  const [showText, setShowText] = useState(false);
  // Ref to store timeout ID so we can clear it on mouse leave
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Size-specific classes
  const sizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl"
  };
  
  // Emoji container size classes (for spacing)
  const emojiContainerClasses = {
    sm: "ml-1",
    md: "ml-2",
    lg: "ml-3"
  };
  
  // Duck emoji size classes (slightly larger)
  const duckSizeClasses = {
    sm: "text-xl",
    md: "text-2xl",
    lg: "text-3xl"
  };
  
  // Egg emoji size classes (slightly smaller than duck)
  const eggSizeClasses = {
    sm: "text-base",
    md: "text-xl",
    lg: "text-2xl"
  };
  
  // Handle mouse enter - start timer for 1.5 seconds
  const handleMouseEnter = () => {
    // Clear any existing timeout
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
    }
    
    // Set new timeout for 1.5 seconds
    hoverTimeoutRef.current = setTimeout(() => {
      setShowText(true);
    }, 1500);
  };
  
  // Handle mouse leave - clear timer and hide text
  const handleMouseLeave = () => {
    // Clear the timeout if it hasn't fired yet
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }
    
    // Hide the text immediately
    setShowText(false);
  };
  
  const LogoContent = (
    <div 
      className={`font-bold flex items-center ${sizeClasses[size]} ${className} group`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className={`${showText ? 'max-w-[120px] opacity-100' : 'max-w-0 opacity-0'} transition-all duration-200 ease-in-out overflow-hidden flex`}>
        <span className="text-gray-500 dark:text-gray-400">5</span>
        <span className="text-gray-700 dark:text-gray-300">Ducks</span>
      </div>
      
      {showEmojis && (
        <div className={`flex items-end ${emojiContainerClasses[size]}`}>
          <span className={duckSizeClasses[size]}>🐥</span>
          <span className={`${eggSizeClasses[size]} md:inline hidden`}>🥚🥚🥚🥚</span>
        </div>
      )}
    </div>
  );
  
  // If logo should be a link, wrap in Link component
  // Links to /app/new-search to trigger a fresh search state
  if (asLink) {
    return (
      <Link 
        href="/app/new-search" 
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