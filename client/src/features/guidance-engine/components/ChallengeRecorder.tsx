import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { Circle, Square, Loader2, Check, Copy, X, ChevronDown, Upload, Play, Pencil, ArrowUp, ArrowDown, Trash2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { QUESTS } from "../quests";
import { useGuidance } from "../context/GuidanceContext";
import type { GeneratedChallenge, Challenge, GuidanceStep } from "../types";

interface ChallengeRecorderProps {
  isOpen: boolean;
  onClose: () => void;
}

type RecorderUIState = "idle" | "recording" | "processing" | "complete";

export function ChallengeRecorder({ isOpen, onClose }: ChallengeRecorderProps) {
  const [location] = useLocation();
  const [uiState, setUIState] = useState<RecorderUIState>("idle");
  const [selectedQuestId, setSelectedQuestId] = useState<string>(QUESTS[0]?.id || "");
  const [generatedChallenge, setGeneratedChallenge] = useState<GeneratedChallenge | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [isInserting, setIsInserting] = useState(false);
  const [insertResult, setInsertResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedChallenge, setEditedChallenge] = useState<GeneratedChallenge | null>(null);
  
  const guidance = useGuidance();
  const { recording, startRecording, stopRecording, clearRecording } = guidance;

  useEffect(() => {
    if (recording.isRecording && uiState !== "recording") {
      setUIState("recording");
    }
  }, [recording.isRecording, uiState]);

  useEffect(() => {
    if (recording.selectedQuestId && recording.selectedQuestId !== selectedQuestId) {
      setSelectedQuestId(recording.selectedQuestId);
    }
  }, [recording.selectedQuestId, selectedQuestId]);

  const handleStartRecording = () => {
    if (!selectedQuestId) {
      setError("Please select a quest before recording");
      return;
    }
    setError(null);
    setGeneratedChallenge(null);
    startRecording(selectedQuestId, location);
    setUIState("recording");
  };

  const handleStopRecording = async () => {
    const steps = stopRecording();
    setUIState("processing");
    
    try {
      const response = await fetch("/api/guidance/generate-challenge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          questId: recording.selectedQuestId || selectedQuestId,
          startRoute: recording.startRoute || location,
          steps,
        }),
      });
      
      if (!response.ok) {
        throw new Error("Failed to generate challenge");
      }
      
      const data = await response.json();
      setGeneratedChallenge(data.challenge);
      setUIState("complete");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate challenge");
      setUIState("idle");
    }
  };

  const copyToClipboard = () => {
    if (!generatedChallenge) return;
    
    const code = JSON.stringify(generatedChallenge, null, 2);
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const insertIntoQuest = async () => {
    if (!generatedChallenge || !selectedQuestId) return;
    
    setIsInserting(true);
    setInsertResult(null);
    
    try {
      const response = await fetch(`/api/guidance/quests/${selectedQuestId}/challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge: generatedChallenge }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        setInsertResult({ success: false, message: data.message || "Failed to insert challenge" });
      } else {
        setInsertResult({ success: true, message: data.message || "Challenge inserted successfully!" });
      }
    } catch (err) {
      setInsertResult({ success: false, message: err instanceof Error ? err.message : "Failed to insert challenge" });
    } finally {
      setIsInserting(false);
    }
  };

  const testChallenge = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!generatedChallenge) return;
    
    const challenge: Challenge = {
      ...generatedChallenge,
      id: `sandbox_${Date.now()}`,
    };
    
    setIsTesting(true);
    
    guidance.startChallenge(challenge, () => {
      setIsTesting(false);
    });
  };

  const reset = () => {
    clearRecording();
    setUIState("idle");
    setGeneratedChallenge(null);
    setError(null);
    setInsertResult(null);
    setIsEditing(false);
    setEditedChallenge(null);
  };

  const startEditing = () => {
    if (generatedChallenge) {
      setEditedChallenge(JSON.parse(JSON.stringify(generatedChallenge)));
      setIsEditing(true);
    }
  };

  const saveEdits = () => {
    if (editedChallenge) {
      setGeneratedChallenge(editedChallenge);
      setIsEditing(false);
      setInsertResult(null);
    }
  };

  const cancelEdits = () => {
    setIsEditing(false);
    setEditedChallenge(null);
  };

  const updateChallengeMeta = (field: keyof GeneratedChallenge, value: string) => {
    if (!editedChallenge) return;
    setEditedChallenge({ ...editedChallenge, [field]: value });
  };

  const updateStep = (index: number, field: keyof GuidanceStep, value: string) => {
    if (!editedChallenge) return;
    const newSteps = [...editedChallenge.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setEditedChallenge({ ...editedChallenge, steps: newSteps });
  };

  const moveStepUp = (index: number) => {
    if (!editedChallenge || index === 0) return;
    const newSteps = [...editedChallenge.steps];
    [newSteps[index - 1], newSteps[index]] = [newSteps[index], newSteps[index - 1]];
    setEditedChallenge({ ...editedChallenge, steps: newSteps });
  };

  const moveStepDown = (index: number) => {
    if (!editedChallenge || index === editedChallenge.steps.length - 1) return;
    const newSteps = [...editedChallenge.steps];
    [newSteps[index], newSteps[index + 1]] = [newSteps[index + 1], newSteps[index]];
    setEditedChallenge({ ...editedChallenge, steps: newSteps });
  };

  const deleteStep = (index: number) => {
    if (!editedChallenge) return;
    const newSteps = editedChallenge.steps.filter((_, i) => i !== index);
    setEditedChallenge({ ...editedChallenge, steps: newSteps });
  };

  const handleClose = () => {
    clearRecording();
    setUIState("idle");
    setGeneratedChallenge(null);
    setError(null);
    setDropdownOpen(false);
    setInsertResult(null);
    onClose();
  };

  useEffect(() => {
    if (!isOpen && recording.isRecording) {
      clearRecording();
      setUIState("idle");
    }
  }, [isOpen, recording.isRecording, clearRecording]);

  if (!isOpen || isTesting) return null;

  const selectedQuest = QUESTS.find(q => q.id === selectedQuestId);
  const steps = recording.steps;

  return createPortal(
    <div data-recorder-ui="true">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          className="fixed bottom-24 right-6 z-[9999] bg-gray-900 rounded-xl shadow-2xl border border-gray-700 w-80 overflow-hidden"
        >
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-800">
            <div className="flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${uiState === "recording" ? "bg-red-500 animate-pulse" : "bg-gray-500"}`} />
              <span className="text-sm font-medium text-white">Challenge Recorder</span>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white transition-colors"
              data-testid="recorder-close"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {uiState === "idle" && (
              <>
                {QUESTS.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-sm text-gray-400">No quests available.</p>
                    <p className="text-xs text-gray-500 mt-1">Add quests to the quests.ts file first.</p>
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <label className="text-xs text-gray-400 uppercase tracking-wide">Select Quest</label>
                      <div className="relative">
                        <button
                          onClick={() => setDropdownOpen(!dropdownOpen)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white text-sm hover:border-gray-500 transition-colors"
                          data-testid="quest-selector"
                        >
                          <span className="flex items-center gap-2">
                            <span>{selectedQuest?.emoji}</span>
                            <span className="truncate">{selectedQuest?.name}</span>
                          </span>
                          <ChevronDown className={`h-4 w-4 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                        </button>
                        
                        <AnimatePresence>
                          {dropdownOpen && (
                            <motion.div
                              initial={{ opacity: 0, y: -5 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: -5 }}
                              className="absolute top-full left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto z-50"
                            >
                              {QUESTS.map((quest) => (
                                <button
                                  key={quest.id}
                                  onClick={() => {
                                    setSelectedQuestId(quest.id);
                                    setDropdownOpen(false);
                                  }}
                                  className={`w-full flex items-center gap-2 px-3 py-2 text-left text-sm hover:bg-gray-700 transition-colors ${
                                    quest.id === selectedQuestId ? 'bg-gray-700 text-amber-400' : 'text-white'
                                  }`}
                                >
                                  <span>{quest.emoji}</span>
                                  <span className="truncate">{quest.name}</span>
                                </button>
                              ))}
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    <Button
                      onClick={handleStartRecording}
                      disabled={!selectedQuestId}
                      className="w-full bg-red-600 hover:bg-red-700 text-white disabled:opacity-50 disabled:cursor-not-allowed"
                      data-testid="start-recording"
                    >
                      <Circle className="h-4 w-4 mr-2 fill-current" />
                      Start Recording
                    </Button>
                  </>
                )}

                {error && (
                  <p className="text-sm text-red-400">{error}</p>
                )}
              </>
            )}

            {uiState === "recording" && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400 uppercase tracking-wide">Recording Steps</span>
                    <span className="text-xs text-amber-400 font-medium">{steps.length} steps</span>
                  </div>
                  
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {steps.length === 0 ? (
                      <p className="text-sm text-gray-500 italic">Click elements to record steps...</p>
                    ) : (
                      steps.map((step, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs text-gray-300 bg-gray-800 rounded px-2 py-1">
                          <span className="text-amber-400">{step.action}</span>
                          <span className="truncate">{step.textContent || step.selector}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <Button
                  onClick={handleStopRecording}
                  disabled={steps.length === 0}
                  className="w-full bg-amber-600 hover:bg-amber-700 text-white"
                  data-testid="stop-recording"
                >
                  <Square className="h-4 w-4 mr-2 fill-current" />
                  Stop & Generate
                </Button>
              </>
            )}

            {uiState === "processing" && (
              <div className="flex flex-col items-center gap-3 py-4">
                <Loader2 className="h-8 w-8 text-amber-400 animate-spin" />
                <p className="text-sm text-gray-300">Generating challenge with AI...</p>
              </div>
            )}

            {uiState === "complete" && generatedChallenge && !isEditing && (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-400" />
                      <span className="text-sm font-medium text-white">Challenge Generated!</span>
                    </div>
                    <button
                      onClick={startEditing}
                      className="text-gray-400 hover:text-amber-400 transition-colors"
                      data-testid="edit-challenge"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  </div>
                  
                  <button
                    onClick={testChallenge}
                    className="w-full text-left bg-gray-800 rounded-lg p-3 space-y-2 hover:bg-gray-700 transition-colors cursor-pointer border border-transparent hover:border-amber-500/50 group"
                    data-testid="test-challenge-card"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{generatedChallenge.emoji}</span>
                        <span className="text-sm font-medium text-white">{generatedChallenge.name}</span>
                      </div>
                      <div className="flex items-center gap-1 text-xs text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-3 w-3" />
                        <span>Test</span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400">{generatedChallenge.description}</p>
                    <p className="text-xs text-gray-500">{generatedChallenge.steps.length} steps</p>
                  </button>
                </div>

                {insertResult && (
                  <div className={`text-xs px-3 py-2 rounded-lg ${insertResult.success ? 'bg-green-900/50 text-green-300' : 'bg-red-900/50 text-red-300'}`}>
                    {insertResult.message}
                  </div>
                )}

                <div className="space-y-2">
                  <Button
                    onClick={insertIntoQuest}
                    disabled={isInserting || insertResult?.success}
                    className="w-full bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                    data-testid="insert-challenge"
                  >
                    {isInserting ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : insertResult?.success ? (
                      <Check className="h-4 w-4 mr-2" />
                    ) : (
                      <Upload className="h-4 w-4 mr-2" />
                    )}
                    {isInserting ? "Inserting..." : insertResult?.success ? "Inserted!" : "Insert into Quest File"}
                  </Button>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={copyToClipboard}
                      variant="outline"
                      className="flex-1 border-gray-600 text-white hover:bg-gray-800"
                      data-testid="copy-challenge"
                    >
                      {copied ? <Check className="h-4 w-4 mr-2" /> : <Copy className="h-4 w-4 mr-2" />}
                      {copied ? "Copied!" : "Copy"}
                    </Button>
                    <Button
                      onClick={reset}
                      className="flex-1 bg-amber-600 hover:bg-amber-700 text-white"
                      data-testid="record-another"
                    >
                      Record Another
                    </Button>
                  </div>
                </div>
              </>
            )}

            {uiState === "complete" && isEditing && editedChallenge && (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-white">Edit Challenge</span>
                  <div className="flex gap-1">
                    <button
                      onClick={cancelEdits}
                      className="text-gray-400 hover:text-white transition-colors p-1"
                      data-testid="cancel-edit"
                    >
                      <X className="h-4 w-4" />
                    </button>
                    <button
                      onClick={saveEdits}
                      className="text-green-400 hover:text-green-300 transition-colors p-1"
                      data-testid="save-edit"
                    >
                      <Save className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <div className="w-12">
                      <label className="text-xs text-gray-500">Emoji</label>
                      <Input
                        value={editedChallenge.emoji}
                        onChange={(e) => updateChallengeMeta("emoji", e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white text-center px-1"
                        data-testid="edit-emoji"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="text-xs text-gray-500">Name</label>
                      <Input
                        value={editedChallenge.name}
                        onChange={(e) => updateChallengeMeta("name", e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white"
                        data-testid="edit-name"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Description</label>
                    <Textarea
                      value={editedChallenge.description}
                      onChange={(e) => updateChallengeMeta("description", e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white text-sm resize-none"
                      rows={2}
                      data-testid="edit-description"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-gray-500">Completion Message</label>
                    <Textarea
                      value={editedChallenge.completionMessage}
                      onChange={(e) => updateChallengeMeta("completionMessage", e.target.value)}
                      className="bg-gray-800 border-gray-600 text-white text-sm resize-none"
                      rows={2}
                      data-testid="edit-completion-message"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs text-gray-500 uppercase tracking-wide">Steps ({editedChallenge.steps.length})</label>
                  
                  {editedChallenge.steps.map((step, idx) => (
                    <div key={step.id || idx} className="bg-gray-800 rounded-lg p-2 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-amber-400 font-medium">Step {idx + 1}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => moveStepUp(idx)}
                            disabled={idx === 0}
                            className="text-gray-400 hover:text-white disabled:opacity-30 p-0.5"
                            data-testid={`step-up-${idx}`}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => moveStepDown(idx)}
                            disabled={idx === editedChallenge.steps.length - 1}
                            className="text-gray-400 hover:text-white disabled:opacity-30 p-0.5"
                            data-testid={`step-down-${idx}`}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => deleteStep(idx)}
                            className="text-red-400 hover:text-red-300 p-0.5"
                            data-testid={`step-delete-${idx}`}
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>

                      <Textarea
                        value={step.instruction}
                        onChange={(e) => updateStep(idx, "instruction", e.target.value)}
                        className="bg-gray-700 border-gray-600 text-white text-xs resize-none"
                        rows={2}
                        placeholder="Instruction..."
                        data-testid={`step-instruction-${idx}`}
                      />

                      <div className="flex gap-2">
                        <div className="flex-1">
                          <Select
                            value={step.tooltipPosition || "auto"}
                            onValueChange={(value) => updateStep(idx, "tooltipPosition", value)}
                          >
                            <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-xs h-7" data-testid={`step-position-${idx}`}>
                              <SelectValue placeholder="Position" />
                            </SelectTrigger>
                            <SelectContent className="bg-gray-800 border-gray-600">
                              <SelectItem value="auto" className="text-white text-xs">Auto</SelectItem>
                              <SelectItem value="top" className="text-white text-xs">Top</SelectItem>
                              <SelectItem value="bottom" className="text-white text-xs">Bottom</SelectItem>
                              <SelectItem value="left" className="text-white text-xs">Left</SelectItem>
                              <SelectItem value="right" className="text-white text-xs">Right</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex-1">
                          <span className="text-[10px] text-gray-500 truncate block">{step.selector}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    onClick={cancelEdits}
                    variant="outline"
                    className="flex-1 border-gray-600 text-white hover:bg-gray-800"
                    data-testid="cancel-edit-btn"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveEdits}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                    data-testid="save-edit-btn"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>,
    document.body
  );
}
