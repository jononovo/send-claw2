import { useState, useMemo, useCallback, useEffect } from "react";
import type { Form, FormSlide, FormSection, FormFlowReturn } from "../types";

export function useFormFlow<T extends Record<string, string>>(
  form: Form<T>,
  options?: { persistToStorage?: boolean }
): FormFlowReturn<T> {
  const allSlides = useMemo(() => {
    return form.sections.flatMap((section) => 
      section.slides.map(slide => ({ slide, section }))
    );
  }, [form.sections]);

  const [currentStep, setCurrentStep] = useState(0);
  const [data, setDataState] = useState<T>(form.initialData);

  // Persist data to localStorage whenever it changes (only if enabled)
  useEffect(() => {
    if (!options?.persistToStorage) return;
    try {
      const storageKey = `form-data-${form.id}`;
      localStorage.setItem(storageKey, JSON.stringify(data));
    } catch (e) {
      console.warn('Failed to persist form data:', e);
    }
  }, [data, form.id, options?.persistToStorage]);

  const visibleSlides = useMemo(() => {
    return allSlides.filter(({ slide }) => {
      if (slide.conditionalOn) {
        return data[slide.conditionalOn as keyof T] === slide.conditionalValue;
      }
      return true;
    });
  }, [allSlides, data]);

  const totalSteps = visibleSlides.length;
  const currentSlideData = visibleSlides[currentStep] || null;
  const currentSlide = currentSlideData?.slide || null;
  const currentSection = currentSlideData?.section || null;
  const progress = totalSteps > 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const setData = useCallback((key: keyof T, value: string) => {
    setDataState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const canContinue = useCallback((): boolean => {
    if (!currentSlide) return false;

    const { slideType, id, validate, optional } = currentSlide;

    if (
      slideType === "welcome" ||
      slideType === "section-intro" ||
      slideType === "section-complete" ||
      slideType === "final-complete"
    ) {
      return true;
    }

    if (optional) {
      return true;
    }

    if (validate) {
      return validate(data);
    }

    if (slideType === "single-select") {
      const value = data[id as keyof T];
      return value !== "" && value !== undefined;
    }

    if (slideType === "multi-select") {
      const value = data[id as keyof T];
      return typeof value === "string" && value.trim() !== "";
    }

    if (slideType === "text-input") {
      const value = data[id as keyof T];
      return typeof value === "string" && value.trim() !== "";
    }

    if (slideType === "multi-field") {
      return true;
    }

    return true;
  }, [currentSlide, data]);

  const handleNext = useCallback(() => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  }, [currentStep, totalSteps]);

  const handleBack = useCallback(() => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  }, [currentStep]);

  const goToSlide = useCallback((slideId: string, newData?: T) => {
    const dataToUse = newData || data;
    const updatedVisibleSlides = allSlides.filter(({ slide }) => {
      if (slide.conditionalOn) {
        return dataToUse[slide.conditionalOn as keyof T] === slide.conditionalValue;
      }
      return true;
    });
    const targetIndex = updatedVisibleSlides.findIndex(({ slide }) => slide.id === slideId);
    if (targetIndex >= 0) {
      setCurrentStep(targetIndex);
    }
  }, [data, allSlides]);

  const getButtonText = useCallback((): string => {
    if (!currentSlide) return "Continue";

    switch (currentSlide.slideType) {
      case "welcome":
        return "Let's Go!";
      case "section-intro":
        return "Let's Do It!";
      case "section-complete":
        return "Keep Going";
      case "final-complete":
        return "Let's find prospects";
      default:
        if (currentStep === totalSteps - 1) return "Finish";
        return "Continue";
    }
  }, [currentSlide, currentStep, totalSteps]);

  const flatVisibleSlides = useMemo(() => {
    return visibleSlides.map(({ slide }) => slide);
  }, [visibleSlides]);

  return {
    currentStep,
    data,
    visibleSlides: flatVisibleSlides,
    totalSteps,
    progress,
    currentSlide,
    currentSection,
    setData,
    handleNext,
    handleBack,
    goToSlide,
    canContinue,
    getButtonText,
  };
}
