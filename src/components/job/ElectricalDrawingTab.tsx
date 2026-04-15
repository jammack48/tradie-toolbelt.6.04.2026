import { useEffect, useMemo, useRef, useState, type ChangeEvent, type MouseEvent, type PointerEvent } from "react";
import { Eraser, Plus, RotateCcw, RotateCw, Trash2, Upload } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  ELECTRICAL_SYMBOL_CATEGORY_LABELS,
  ELECTRICAL_SYMBOL_CATEGORY_ORDER,
} from "@/data/nzElectricalSymbols";
import { loadElectricalPlan, loadElectricalSymbolLibrary, saveElectricalPlan, saveElectricalSymbolLibrary } from "@/lib/electricalSymbolsStorage";
import type {
  ElectricalSymbolCategory,
  ElectricalSymbolDefinition,
  ElectricalSymbolPlacement,
} from "@/types/electricalSymbols";

interface ElectricalDrawingTabProps {
  jobId: string;
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

function renderGlyph(symbol: ElectricalSymbolDefinition, strokeWidth: number) {
  const shared = {
    stroke: "currentColor",
    strokeWidth,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    fill: "none",
  };

  switch (symbol.glyph) {
    case "downlight":
      return (
        <>
          <circle cx="12" cy="12" r="5.4" {...shared} />
          <line x1="8" y1="8" x2="16" y2="16" {...shared} />
          <line x1="16" y1="8" x2="8" y2="16" {...shared} />
        </>
      );
    case "pendant-light":
      return (
        <>
          <line x1="12" y1="3.5" x2="12" y2="9" {...shared} />
          <circle cx="12" cy="13" r="4.4" {...shared} />
        </>
      );
    case "wall-light":
      return (
        <>
          <line x1="7" y1="4" x2="7" y2="20" {...shared} />
          <path d="M7 12h6" {...shared} />
          <path d="M13 8a4 4 0 0 1 0 8" {...shared} />
        </>
      );
    case "fluorescent":
      return (
        <>
          <line x1="5" y1="12" x2="19" y2="12" {...shared} />
          <line x1="5" y1="9.5" x2="5" y2="14.5" {...shared} />
          <line x1="19" y1="9.5" x2="19" y2="14.5" {...shared} />
        </>
      );
    case "spotlight":
      return (
        <>
          <circle cx="12" cy="12" r="3.8" {...shared} />
          <line x1="12" y1="3.5" x2="12" y2="6" {...shared} />
          <line x1="12" y1="18" x2="12" y2="20.5" {...shared} />
          <line x1="3.5" y1="12" x2="6" y2="12" {...shared} />
          <line x1="18" y1="12" x2="20.5" y2="12" {...shared} />
        </>
      );
    case "single-socket":
      return (
        <>
          <line x1="16.5" y1="4" x2="16.5" y2="20" {...shared} />
          <path d="M8 8a4 4 0 0 1 0 8" {...shared} />
          <path d="M10 10a2 2 0 0 1 0 4" {...shared} />
        </>
      );
    case "double-socket":
      return (
        <>
          <line x1="16.5" y1="4" x2="16.5" y2="20" {...shared} />
          <path d="M8 8a4 4 0 0 1 0 8" {...shared} />
          <path d="M8 6a4 4 0 0 1 0 8" {...shared} />
        </>
      );
    case "switched-socket":
      return (
        <>
          <line x1="16.5" y1="4" x2="16.5" y2="20" {...shared} />
          <path d="M8 8a4 4 0 0 1 0 8" {...shared} />
          <line x1="13.5" y1="6.5" x2="18.8" y2="3.2" {...shared} />
          <circle cx="13.2" cy="6.7" r="0.8" fill="currentColor" />
        </>
      );
    case "switch-1-way":
      return (
        <>
          <line x1="8" y1="16.5" x2="16.4" y2="8.2" {...shared} />
          <circle cx="8" cy="16.5" r="2.1" {...shared} />
        </>
      );
    case "switch-2-way":
      return (
        <>
          <line x1="8" y1="16.5" x2="16.4" y2="8.2" {...shared} />
          <circle cx="8" cy="16.5" r="2.1" {...shared} />
          <text x="17.5" y="7.8" fontSize="4.3" fill="currentColor" textAnchor="middle">
            2
          </text>
        </>
      );
    case "dimmer":
      return (
        <>
          <circle cx="12" cy="12" r="5" {...shared} />
          <line x1="8.7" y1="15.4" x2="15.6" y2="8.5" {...shared} />
        </>
      );
    case "data-outlet":
      return (
        <>
          <rect x="6.4" y="6.4" width="11.2" height="11.2" {...shared} />
          <text x="12" y="14.6" fontSize="4.4" fill="currentColor" textAnchor="middle">
            D
          </text>
        </>
      );
    case "tv-outlet":
      return (
        <>
          <rect x="6.4" y="6.4" width="11.2" height="11.2" {...shared} />
          <text x="12" y="14.6" fontSize="4.1" fill="currentColor" textAnchor="middle">
            TV
          </text>
        </>
      );
    case "phone-outlet":
      return (
        <>
          <rect x="6.4" y="6.4" width="11.2" height="11.2" {...shared} />
          <text x="12" y="14.6" fontSize="3.6" fill="currentColor" textAnchor="middle">
            TEL
          </text>
        </>
      );
    case "wifi-ap":
      return (
        <>
          <circle cx="12" cy="15.5" r="1.2" fill="currentColor" />
          <path d="M8 13a5.8 5.8 0 0 1 8 0" {...shared} />
          <path d="M6.2 10.5a8.5 8.5 0 0 1 11.6 0" {...shared} />
        </>
      );
    case "heat-pump-indoor":
      return (
        <>
          <rect x="4.8" y="8.3" width="14.4" height="7.4" rx="1.3" {...shared} />
          <line x1="7" y1="17.4" x2="17" y2="17.4" {...shared} />
          <path d="M8.5 13.5c1 .8 2 .8 3 0s2-.8 3 0 2 .8 3 0" {...shared} />
        </>
      );
    case "heat-pump-outdoor":
      return (
        <>
          <rect x="5.4" y="5.4" width="13.2" height="13.2" rx="1.4" {...shared} />
          <circle cx="12" cy="12" r="3.5" {...shared} />
          <line x1="12" y1="8" x2="12" y2="16" {...shared} />
          <line x1="8" y1="12" x2="16" y2="12" {...shared} />
        </>
      );
    case "supply-vent":
      return (
        <>
          <polygon points="12,6.2 18,17.2 6,17.2" {...shared} />
          <line x1="12" y1="10" x2="12" y2="15.2" {...shared} />
        </>
      );
    case "return-air":
      return (
        <>
          <rect x="6" y="6" width="12" height="12" {...shared} />
          <line x1="6" y1="10" x2="18" y2="10" {...shared} />
          <line x1="6" y1="14" x2="18" y2="14" {...shared} />
          <line x1="10" y1="6" x2="10" y2="18" {...shared} />
          <line x1="14" y1="6" x2="14" y2="18" {...shared} />
        </>
      );
    case "thermostat":
      return (
        <>
          <circle cx="12" cy="12" r="5.1" {...shared} />
          <text x="12" y="14.5" fontSize="5.2" fill="currentColor" textAnchor="middle">
            T
          </text>
        </>
      );
    case "smoke-alarm":
      return (
        <>
          <circle cx="12" cy="12" r="5.8" {...shared} />
          <path d="M9 13.5c1-.9 2-1.2 3-1.2s2 .3 3 1.2" {...shared} />
          <line x1="12" y1="7.6" x2="12" y2="9.3" {...shared} />
        </>
      );
    case "custom-tag":
      return (
        <>
          <circle cx="12" cy="12" r="6.4" {...shared} />
          <text x="12" y="14.4" fontSize="4.1" fill="currentColor" textAnchor="middle">
            {(symbol.label || symbol.name || "SYM").slice(0, 4).toUpperCase()}
          </text>
        </>
      );
    default:
      return <circle cx="12" cy="12" r="6" {...shared} />;
  }
}

function SymbolPreview({
  symbol,
  size,
  strokeWidth,
  className,
}: {
  symbol: ElectricalSymbolDefinition;
  size: number;
  strokeWidth: number;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {renderGlyph(symbol, strokeWidth)}
    </svg>
  );
}

export function ElectricalDrawingTab({ jobId }: ElectricalDrawingTabProps) {
  const [library, setLibrary] = useState(() => loadElectricalSymbolLibrary());
  const [placements, setPlacements] = useState<ElectricalSymbolPlacement[]>([]);
  const [backgroundImage, setBackgroundImage] = useState<string | null>(null);
  const [selectedSymbolId, setSelectedSymbolId] = useState<string | null>(null);
  const [selectedPlacementId, setSelectedPlacementId] = useState<string | null>(null);
  const [newSymbolName, setNewSymbolName] = useState("");
  const [newSymbolLabel, setNewSymbolLabel] = useState("");
  const [newSymbolCategory, setNewSymbolCategory] = useState<ElectricalSymbolCategory>("lights");

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ placementId: string; pointerId: number } | null>(null);

  useEffect(() => {
    const plan = loadElectricalPlan(jobId);
    setPlacements(plan.placements);
    setBackgroundImage(plan.backgroundImage);
    setSelectedPlacementId(null);
  }, [jobId]);

  useEffect(() => {
    saveElectricalSymbolLibrary(library);
  }, [library]);

  useEffect(() => {
    saveElectricalPlan(jobId, { placements, backgroundImage });
  }, [jobId, placements, backgroundImage]);

  useEffect(() => {
    if (!selectedSymbolId && library.symbols.length > 0) {
      setSelectedSymbolId(library.symbols[0].id);
      return;
    }
    if (selectedSymbolId && !library.symbols.some((symbol) => symbol.id === selectedSymbolId)) {
      setSelectedSymbolId(library.symbols[0]?.id ?? null);
    }
  }, [selectedSymbolId, library.symbols]);

  useEffect(() => {
    if (selectedPlacementId && !placements.some((placement) => placement.id === selectedPlacementId)) {
      setSelectedPlacementId(null);
    }
  }, [selectedPlacementId, placements]);

  const symbolsById = useMemo(
    () =>
      library.symbols.reduce<Record<string, ElectricalSymbolDefinition>>((acc, symbol) => {
        acc[symbol.id] = symbol;
        return acc;
      }, {}),
    [library.symbols],
  );

  const symbolsByCategory = useMemo(() => {
    const grouped = ELECTRICAL_SYMBOL_CATEGORY_ORDER.reduce<Record<ElectricalSymbolCategory, ElectricalSymbolDefinition[]>>(
      (acc, category) => {
        acc[category] = [];
        return acc;
      },
      {
        lights: [],
        power: [],
        switches: [],
        data: [],
        hvac: [],
        safety: [],
      },
    );
    library.symbols.forEach((symbol) => {
      grouped[symbol.category].push(symbol);
    });
    return grouped;
  }, [library.symbols]);

  const selectedPlacement = useMemo(
    () => placements.find((placement) => placement.id === selectedPlacementId) ?? null,
    [placements, selectedPlacementId],
  );

  const updateLibrarySymbol = (symbolId: string, updater: (symbol: ElectricalSymbolDefinition) => ElectricalSymbolDefinition) => {
    setLibrary((prev) => ({
      ...prev,
      symbols: prev.symbols.map((symbol) => (symbol.id === symbolId ? updater(symbol) : symbol)),
    }));
  };

  const updatePlacement = (placementId: string, updater: (placement: ElectricalSymbolPlacement) => ElectricalSymbolPlacement) => {
    setPlacements((prev) =>
      prev.map((placement) => (placement.id === placementId ? updater(placement) : placement)),
    );
  };

  const handleCanvasClick = (event: MouseEvent<HTMLDivElement>) => {
    if (!selectedSymbolId || !canvasRef.current) return;
    const selectedSymbol = symbolsById[selectedSymbolId];
    if (!selectedSymbol) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);

    const createdPlacement: ElectricalSymbolPlacement = {
      id: `pl-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      symbolId: selectedSymbol.id,
      x,
      y,
      rotation: 0,
      label: selectedSymbol.label,
    };

    setPlacements((prev) => [...prev, createdPlacement]);
    setSelectedPlacementId(createdPlacement.id);
  };

  const beginDragPlacement = (placementId: string, event: PointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    dragRef.current = { placementId, pointerId: event.pointerId };
    event.currentTarget.setPointerCapture(event.pointerId);
    setSelectedPlacementId(placementId);
  };

  const moveDragPlacement = (placementId: string, event: PointerEvent<HTMLButtonElement>) => {
    const activeDrag = dragRef.current;
    if (!activeDrag || activeDrag.placementId !== placementId || activeDrag.pointerId !== event.pointerId || !canvasRef.current) return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = clamp((event.clientX - rect.left) / rect.width, 0, 1);
    const y = clamp((event.clientY - rect.top) / rect.height, 0, 1);
    updatePlacement(placementId, (placement) => ({ ...placement, x, y }));
  };

  const endDragPlacement = (_placementId: string, event: PointerEvent<HTMLButtonElement>) => {
    const activeDrag = dragRef.current;
    if (!activeDrag || activeDrag.pointerId !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    dragRef.current = null;
  };

  const clearPlacements = () => {
    setPlacements([]);
    setSelectedPlacementId(null);
  };

  const applyCommonSizeToAll = () => {
    setLibrary((prev) => ({
      ...prev,
      symbols: prev.symbols.map((symbol) => ({
        ...symbol,
        size: prev.style.baseSize,
      })),
    }));
    toast({
      title: "Common size applied",
      description: "All symbol definitions now use the same base size.",
    });
  };

  const addCustomSymbol = () => {
    const normalizedName = newSymbolName.trim();
    if (!normalizedName) {
      toast({
        title: "Add a symbol name",
        description: "Give your custom symbol a short name first.",
        variant: "destructive",
      });
      return;
    }

    const customSymbol: ElectricalSymbolDefinition = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: normalizedName,
      category: newSymbolCategory,
      glyph: "custom-tag",
      size: library.style.baseSize,
      label: (newSymbolLabel.trim() || normalizedName).slice(0, 4).toUpperCase(),
      isCustom: true,
    };

    setLibrary((prev) => ({
      ...prev,
      symbols: [...prev.symbols, customSymbol],
    }));
    setSelectedSymbolId(customSymbol.id);
    setNewSymbolName("");
    setNewSymbolLabel("");
  };

  const removeCustomSymbol = (symbolId: string) => {
    setLibrary((prev) => ({
      ...prev,
      symbols: prev.symbols.filter((symbol) => symbol.id !== symbolId),
    }));
    setPlacements((prev) => prev.filter((placement) => placement.symbolId !== symbolId));
  };

  const uploadBackground = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setBackgroundImage(typeof reader.result === "string" ? reader.result : null);
    };
    reader.readAsDataURL(file);
    event.target.value = "";
  };

  return (
    <div className="space-y-3">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">NZ Residential Electrical Drawing</CardTitle>
          <p className="text-xs text-muted-foreground">
            Pick a category, tap a symbol, then tap the drawing to place it. Drag symbols to move, rotate when needed,
            and your setup saves automatically for this job.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <Label htmlFor="drawing-background-upload" className="inline-flex">
              <Button type="button" variant="outline" size="sm" className="h-8 gap-1.5" asChild>
                <span>
                  <Upload className="w-3.5 h-3.5" />
                  Upload Plan
                </span>
              </Button>
            </Label>
            <input
              id="drawing-background-upload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={uploadBackground}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={() => setBackgroundImage(null)}
              disabled={!backgroundImage}
            >
              <Eraser className="w-3.5 h-3.5" />
              Clear Plan
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-8 gap-1.5"
              onClick={clearPlacements}
              disabled={placements.length === 0}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Symbols
            </Button>
            {selectedSymbolId && symbolsById[selectedSymbolId] && (
              <Badge variant="secondary" className="text-[11px]">
                Selected: {symbolsById[selectedSymbolId].name}
              </Badge>
            )}
          </div>

          <div
            ref={canvasRef}
            onClick={handleCanvasClick}
            className="relative aspect-[4/3] w-full overflow-hidden rounded-lg border bg-muted/25"
          >
            {backgroundImage ? (
              <img
                src={backgroundImage}
                alt="Uploaded plan"
                className="absolute inset-0 h-full w-full object-contain"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-center text-xs text-muted-foreground px-4">
                Upload a plan image, or place symbols directly on this blank workspace.
              </div>
            )}

            {placements.map((placement) => {
              const symbol = symbolsById[placement.symbolId];
              if (!symbol) return null;
              const size = placement.sizeOverride ?? symbol.size ?? library.style.baseSize;
              const isSelected = selectedPlacementId === placement.id;
              return (
                <button
                  key={placement.id}
                  type="button"
                  className={cn(
                    "absolute rounded-md p-1 text-foreground transition",
                    isSelected && "ring-2 ring-primary bg-primary/10",
                  )}
                  style={{
                    left: `${placement.x * 100}%`,
                    top: `${placement.y * 100}%`,
                    transform: `translate(-50%, -50%) rotate(${placement.rotation}deg)`,
                  }}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedPlacementId(placement.id);
                  }}
                  onPointerDown={(event) => beginDragPlacement(placement.id, event)}
                  onPointerMove={(event) => moveDragPlacement(placement.id, event)}
                  onPointerUp={(event) => endDragPlacement(placement.id, event)}
                  onPointerCancel={(event) => endDragPlacement(placement.id, event)}
                >
                  <SymbolPreview symbol={symbol} size={size} strokeWidth={library.style.strokeWidth} />
                  {placement.label && (
                    <span className="absolute left-1/2 top-full mt-0.5 -translate-x-1/2 rounded bg-background/80 px-1 py-0.5 text-[9px] font-semibold leading-none text-foreground border border-border">
                      {placement.label}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {selectedPlacement && (
            <div className="rounded-lg border bg-card p-2.5 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-card-foreground">Selected placement</p>
                <p className="text-[11px] text-muted-foreground truncate">
                  {symbolsById[selectedPlacement.symbolId]?.name ?? "Unknown symbol"}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Label</Label>
                  <Input
                    className="h-8 text-xs"
                    value={selectedPlacement.label ?? ""}
                    onChange={(event) =>
                      updatePlacement(selectedPlacement.id, (placement) => ({
                        ...placement,
                        label: event.target.value,
                      }))
                    }
                    placeholder="Optional note"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Size override (px)</Label>
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    min={16}
                    max={80}
                    value={selectedPlacement.sizeOverride ?? ""}
                    onChange={(event) => {
                      const rawValue = event.target.value;
                      updatePlacement(selectedPlacement.id, (placement) => ({
                        ...placement,
                        sizeOverride: rawValue === "" ? undefined : clamp(parseFloat(rawValue) || 0, 16, 80),
                      }));
                    }}
                    placeholder="Auto"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">Rotate</Label>
                  <div className="flex gap-1.5">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1"
                      onClick={() =>
                        updatePlacement(selectedPlacement.id, (placement) => ({
                          ...placement,
                          rotation: placement.rotation - 15,
                        }))
                      }
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1"
                      onClick={() =>
                        updatePlacement(selectedPlacement.id, (placement) => ({
                          ...placement,
                          rotation: placement.rotation + 15,
                        }))
                      }
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 flex-1"
                      onClick={() => {
                        setPlacements((prev) => prev.filter((placement) => placement.id !== selectedPlacement.id));
                        setSelectedPlacementId(null);
                      }}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Symbol Picker</CardTitle>
          <p className="text-xs text-muted-foreground">
            Expand a group to browse symbols. Tap one to make it active for placement.
          </p>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" defaultValue={["lights", "power"]} className="w-full">
            {ELECTRICAL_SYMBOL_CATEGORY_ORDER.map((category) => (
              <AccordionItem key={category} value={category}>
                <AccordionTrigger className="py-2">
                  <span className="flex items-center gap-2 text-sm">
                    {ELECTRICAL_SYMBOL_CATEGORY_LABELS[category]}
                    <Badge variant="outline" className="text-[10px]">{symbolsByCategory[category].length}</Badge>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pb-2">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {symbolsByCategory[category].map((symbol) => {
                      const isActive = selectedSymbolId === symbol.id;
                      return (
                        <button
                          key={symbol.id}
                          type="button"
                          onClick={() => setSelectedSymbolId(symbol.id)}
                          className={cn(
                            "rounded-md border p-2 text-left transition hover:border-primary/50",
                            isActive ? "border-primary bg-primary/10" : "border-border bg-background",
                          )}
                        >
                          <div className="flex items-center gap-2">
                            <SymbolPreview symbol={symbol} size={18} strokeWidth={library.style.strokeWidth} />
                            <span className="text-xs font-medium text-card-foreground leading-tight">{symbol.name}</span>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base">Common Style & Library</CardTitle>
          <p className="text-xs text-muted-foreground">
            Keep symbol visuals consistent, then add custom symbols for your own drawing conventions.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Common size (px)</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                min={18}
                max={72}
                value={library.style.baseSize}
                onChange={(event) =>
                  setLibrary((prev) => ({
                    ...prev,
                    style: { ...prev.style, baseSize: clamp(parseFloat(event.target.value) || 0, 18, 72) },
                  }))
                }
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px] text-muted-foreground">Line thickness</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                min={0.8}
                max={4}
                step={0.1}
                value={library.style.strokeWidth}
                onChange={(event) =>
                  setLibrary((prev) => ({
                    ...prev,
                    style: { ...prev.style, strokeWidth: clamp(parseFloat(event.target.value) || 0, 0.8, 4) },
                  }))
                }
              />
            </div>
            <div className="flex items-end">
              <Button type="button" variant="outline" className="h-8 w-full text-xs" onClick={applyCommonSizeToAll}>
                Apply common size to all
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-2.5 space-y-2">
            <p className="text-xs font-semibold text-card-foreground">Add custom symbol</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <Input
                className="h-8 text-xs"
                placeholder="Name"
                value={newSymbolName}
                onChange={(event) => setNewSymbolName(event.target.value)}
              />
              <Input
                className="h-8 text-xs"
                placeholder="Tag (e.g. EX)"
                maxLength={4}
                value={newSymbolLabel}
                onChange={(event) => setNewSymbolLabel(event.target.value.toUpperCase())}
              />
              <Select value={newSymbolCategory} onValueChange={(value) => setNewSymbolCategory(value as ElectricalSymbolCategory)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ELECTRICAL_SYMBOL_CATEGORY_ORDER.map((category) => (
                    <SelectItem key={category} value={category}>
                      {ELECTRICAL_SYMBOL_CATEGORY_LABELS[category]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="button" size="sm" className="h-8 gap-1.5 text-xs" onClick={addCustomSymbol}>
              <Plus className="w-3.5 h-3.5" />
              Add symbol
            </Button>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-card-foreground">Modify saved symbols</p>
            {library.symbols.map((symbol) => (
              <div key={symbol.id} className="rounded-md border p-2 space-y-2">
                <div className="flex items-center gap-2">
                  <SymbolPreview symbol={symbol} size={18} strokeWidth={library.style.strokeWidth} />
                  <Input
                    className="h-8 text-xs"
                    value={symbol.name}
                    onChange={(event) =>
                      updateLibrarySymbol(symbol.id, (current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                  />
                  {symbol.isCustom && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeCustomSymbol(symbol.id)}
                    >
                      <Trash2 className="w-3.5 h-3.5 text-destructive" />
                    </Button>
                  )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Select
                    value={symbol.category}
                    onValueChange={(value) =>
                      updateLibrarySymbol(symbol.id, (current) => ({
                        ...current,
                        category: value as ElectricalSymbolCategory,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ELECTRICAL_SYMBOL_CATEGORY_ORDER.map((category) => (
                        <SelectItem key={category} value={category}>
                          {ELECTRICAL_SYMBOL_CATEGORY_LABELS[category]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    className="h-8 text-xs"
                    type="number"
                    min={18}
                    max={72}
                    value={symbol.size}
                    onChange={(event) =>
                      updateLibrarySymbol(symbol.id, (current) => ({
                        ...current,
                        size: clamp(parseFloat(event.target.value) || 0, 18, 72),
                      }))
                    }
                  />
                  <Input
                    className="h-8 text-xs"
                    maxLength={8}
                    value={symbol.label ?? ""}
                    placeholder="Tag"
                    onChange={(event) =>
                      updateLibrarySymbol(symbol.id, (current) => ({
                        ...current,
                        label: event.target.value.toUpperCase(),
                      }))
                    }
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
