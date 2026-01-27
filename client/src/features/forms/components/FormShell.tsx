import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createPortal } from "react-dom";
import type { FormShellProps, SlideComponentProps } from "../types";
import { fireShortConfetti, fireFinalConfetti } from "@/features/animations";
import { apiRequest } from "@/lib/queryClient";
import { SlideSingleSelect } from "./SlideSingleSelect";
import { SlideMultiSelect } from "./SlideMultiSelect";
import { SlideTextInput } from "./SlideTextInput";
import { WelcomeScreen } from "./WelcomeScreen";
import { SectionIntro } from "./SectionIntro";
import { SectionComplete } from "./SectionComplete";
import { FinalComplete } from "./FinalComplete";
import { AutoAdvanceButton } from "./AutoAdvanceButton";

export function FormShell<T extends Record<string, string>>({
  isOpen,
  onClose,
  onComplete,
  flow,
  componentRegistry = {},
  onSkip,
}: FormShellProps<T>) {
  const confettiFiredRef = useRef<number | null>(null);
  const creditClaimedRef = useRef<Set<string>>(new Set());

  const {
    currentStep,
    data,
    progress,
    currentSlide,
    currentSection,
    setData,
    handleNext,
    handleBack,
    canContinue,
    getButtonText,
    totalSteps,
  } = flow;

  useEffect(() => {
    if (confettiFiredRef.current === currentStep) return;

    if (currentSlide?.slideType === "section-complete") {
      confettiFiredRef.current = currentStep;
      fireShortConfetti();
      
      const slideId = currentSlide.id;
      if (slideId && !creditClaimedRef.current.has(slideId)) {
        creditClaimedRef.current.add(slideId);
        const milestoneId = `onboarding-${slideId}`;
        console.log(`[Forms] Claiming credits for milestone: ${milestoneId}`);
        
        apiRequest("POST", `/api/progress/form/milestone/${milestoneId}`)
          .then((response) => {
            console.log(`[Forms] Credit claim response:`, response);
          })
          .catch((error) => {
            console.error(`[Forms] Failed to claim credits for ${milestoneId}:`, error);
          });
      }
    } else if (currentSlide?.slideType === "final-complete") {
      confettiFiredRef.current = currentStep;
      fireFinalConfetti();
    }
  }, [currentStep, currentSlide]);


  const handleSelect = (slideId: string, optionId: string) => {
    setData(slideId as keyof T, optionId);
  };

  const handleTextInput = (slideId: string, value: string) => {
    setData(slideId as keyof T, value);
  };

  const handleContinue = () => {
    if (currentStep === totalSteps - 1) {
      onComplete();
    } else {
      handleNext();
    }
  };

  if (!isOpen) return null;

  const renderSlideContent = () => {
    if (!currentSlide) return null;

    const props: SlideComponentProps<T> = {
      slide: currentSlide,
      data,
      onSelect: handleSelect,
      onTextInput: handleTextInput,
      onNext: handleNext,
    };

    if (currentSlide.component && componentRegistry[currentSlide.component]) {
      const CustomComponent = componentRegistry[currentSlide.component];
      return <CustomComponent {...props} />;
    }

    switch (currentSlide.slideType) {
      case "welcome":
        return (
          <WelcomeScreen
            title={currentSlide.title}
            subtitle={currentSlide.subtitle}
            emoji={currentSlide.emoji}
          />
        );
      case "section-intro":
        return (
          <SectionIntro
            title={currentSlide.title}
            subtitle={currentSlide.subtitle}
            emoji={currentSlide.emoji}
          />
        );
      case "section-complete":
        return (
          <SectionComplete
            title={currentSlide.title}
            subtitle={currentSlide.subtitle}
            emoji={currentSlide.emoji}
            credits={currentSection?.completionCredits}
          />
        );
      case "final-complete":
        return (
          <FinalComplete
            title={currentSlide.title}
            subtitle={currentSlide.subtitle}
            emoji={currentSlide.emoji}
          />
        );
      case "single-select":
        return <SlideSingleSelect {...props} />;
      case "multi-select":
        return <SlideMultiSelect {...props} />;
      case "text-input":
        return <SlideTextInput {...props} />;
      case "multi-field":
        if (currentSlide.component && componentRegistry[currentSlide.component]) {
          const CustomComponent = componentRegistry[currentSlide.component];
          return <CustomComponent {...props} />;
        }
        return null;
      default:
        return null;
    }
  };

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[70] bg-[#0a0a0f] flex flex-col"
    >
      <div className="flex items-center justify-between px-6 py-4">
        <button
          onClick={handleBack}
          className={`p-2 rounded-full hover:bg-white/10 transition-colors ${
            currentStep === 0 ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
          data-testid="button-form-back"
        >
          <ChevronLeft className="w-6 h-6 text-white/70" />
        </button>

        <div className="flex-1 mx-8 max-w-md">
          <div className="h-2 bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-yellow-400 to-amber-500 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.3, ease: "easeOut" }}
            />
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-white/10 transition-colors"
          data-testid="button-form-close"
        >
          <X className="w-6 h-6 text-white/70" />
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-6 overflow-y-auto">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -50 }}
              transition={{ duration: 0.3 }}
              className="space-y-8"
            >
              {renderSlideContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>

      {currentSlide?.slideType !== "single-select" && (
        <div className="px-6 py-6">
          <div className="max-w-lg mx-auto">
            {currentSlide?.slideType === "welcome" ? (
              <AutoAdvanceButton
                key={`auto-advance-${currentStep}`}
                duration={3000}
                delayMs={5000}
                onClick={handleContinue}
                label="Let's Go!"
                shortCountdown
              />
            ) : currentSlide?.slideType === "section-complete" ? (
              <AutoAdvanceButton
                key={`auto-advance-${currentStep}`}
                duration={3000}
                onClick={handleContinue}
                label="Keep Going"
                countdownPrefix="Next in"
              />
            ) : currentSlide?.slideType === "final-complete" ? (
              <AutoAdvanceButton
                key={`auto-advance-${currentStep}`}
                duration={5000}
                onClick={handleContinue}
                label="Let's find prospects"
                countdownPrefix="Finishing in"
              />
            ) : currentSlide?.slideType === "section-intro" ? (
              <AutoAdvanceButton
                key={`auto-advance-${currentStep}`}
                duration={3000}
                delayMs={500}
                onClick={handleContinue}
                label="Let's Do It!"
                countdownPrefix="Let's Do It in"
                muted
              />
            ) : (
              <Button
                onClick={handleContinue}
                disabled={!canContinue()}
                className={`w-full h-14 text-lg font-bold rounded-xl transition-all ${
                  canContinue()
                    ? "bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-500 hover:to-amber-600 text-black shadow-[0_0_30px_rgba(250,204,21,0.3)]"
                    : "bg-white/10 text-gray-500 cursor-not-allowed"
                }`}
                data-testid="button-form-continue"
              >
                {getButtonText()}
                <ChevronRight className="w-5 h-5 ml-2" />
              </Button>
            )}
            
            {currentSlide?.skipLink && onSkip && (
              <button
                onClick={onSkip}
                className="w-full mt-4 text-lg text-gray-400 hover:text-white transition-colors"
                data-testid="button-form-skip"
              >
                {currentSlide.skipLink.text}
              </button>
            )}
          </div>
        </div>
      )}
    </motion.div>,
    document.body
  );
}
