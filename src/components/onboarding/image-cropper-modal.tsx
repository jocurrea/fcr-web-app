"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, ZoomIn, ZoomOut, RotateCw, RefreshCw, Check, Move } from "lucide-react";

interface ImageCropperModalProps {
  imageSrc: string;
  isOpen: boolean;
  onCropComplete: (croppedBlob: Blob, croppedDataUrl: string) => void;
  onCancel: () => void;
}

const CONTAINER_SIZE = 300;
const CROP_DIAMETER = 240;
const OUTPUT_SIZE = 512;

export function ImageCropperModal({
  imageSrc,
  isOpen,
  onCropComplete,
  onCancel,
}: ImageCropperModalProps) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset parameters when imageSrc changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setIsDragging(false);
    }
  }, [isOpen, imageSrc]);

  // Compute initial display size based on image aspect ratio to cover the crop circle
  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const { naturalWidth, naturalHeight } = e.currentTarget;
    setNaturalSize({ width: naturalWidth, height: naturalHeight });

    const imgAspect = naturalWidth / naturalHeight;
    let w = CROP_DIAMETER;
    let h = CROP_DIAMETER;

    if (imgAspect > 1) {
      // Landscape: height matches crop diameter, width scales up
      h = CROP_DIAMETER;
      w = CROP_DIAMETER * imgAspect;
    } else {
      // Portrait or square: width matches crop diameter, height scales up
      w = CROP_DIAMETER;
      h = CROP_DIAMETER / imgAspect;
    }

    setDisplaySize({ width: w, height: h });
  };

  // Drag handling (Mouse)
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    setPan({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Drag handling (Touch)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({ x: touch.clientX - pan.x, y: touch.clientY - pan.y });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging || e.touches.length !== 1) return;
    const touch = e.touches[0];
    setPan({
      x: touch.clientX - dragStart.x,
      y: touch.clientY - dragStart.y,
    });
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
  };

  // Window listeners for mouse drag so user doesn't lose drag if cursor leaves box
  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Wheel zoom
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY * -0.002;
    setZoom(prev => Math.min(Math.max(1, prev + delta), 3.5));
  };

  // Rotate 90 degrees
  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  // Reset position and zoom
  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // Perform crop to canvas and export
  const handleSaveCrop = async () => {
    if (!imgRef.current) return;
    setIsProcessing(true);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = OUTPUT_SIZE;
      canvas.height = OUTPUT_SIZE;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        setIsProcessing(false);
        return;
      }

      ctx.imageSmoothingQuality = "high";
      ctx.imageSmoothingEnabled = true;

      // Scale ratio from displayed crop diameter to final output canvas
      const scaleRatio = OUTPUT_SIZE / CROP_DIAMETER;

      // Move origin to canvas center
      ctx.translate(OUTPUT_SIZE / 2, OUTPUT_SIZE / 2);

      // Apply zoom & scale
      ctx.scale(scaleRatio, scaleRatio);

      // Apply pan
      ctx.translate(pan.x, pan.y);

      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);

      // Apply zoom
      ctx.scale(zoom, zoom);

      // Draw the image centered
      const drawW = displaySize.width;
      const drawH = displaySize.height;
      ctx.drawImage(imgRef.current, -drawW / 2, -drawH / 2, drawW, drawH);

      // Convert to blob and dataUrl
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

      canvas.toBlob(
        (blob) => {
          setIsProcessing(false);
          if (blob) {
            onCropComplete(blob, dataUrl);
          }
        },
        "image/jpeg",
        0.92
      );
    } catch (err) {
      console.error("Error cropping image:", err);
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-gray-100 flex flex-col p-5 sm:p-6 animate-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-xl font-extrabold text-gray-900 leading-tight">
              Crop Profile Photo
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Drag to reposition, zoom or rotate to fit the frame.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center transition-colors cursor-pointer"
            title="Cancel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Cropper Viewport */}
        <div className="relative flex items-center justify-center my-4 select-none">
          <div
            ref={containerRef}
            onMouseDown={handleMouseDown}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onWheel={handleWheel}
            className="relative overflow-hidden bg-gray-950 rounded-2xl flex items-center justify-center cursor-grab active:cursor-grabbing shadow-inner"
            style={{ width: `${CONTAINER_SIZE}px`, height: `${CONTAINER_SIZE}px` }}
          >
            {/* The Image being transformed */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Crop target"
              onLoad={handleImageLoad}
              crossOrigin="anonymous"
              draggable={false}
              className="max-w-none pointer-events-none select-none transition-transform duration-75 ease-out"
              style={{
                width: displaySize.width ? `${displaySize.width}px` : "auto",
                height: displaySize.height ? `${displaySize.height}px` : "auto",
                transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                transformOrigin: "center center",
              }}
            />

            {/* Circular Mask Overlay */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              {/* Outer shadow simulating a circular cutout */}
              <div
                className="rounded-full border-2 border-white/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.55)] transition-all"
                style={{ width: `${CROP_DIAMETER}px`, height: `${CROP_DIAMETER}px` }}
              />
            </div>

            {/* Hint Badge */}
            <div className="absolute bottom-2.5 bg-black/60 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-full flex items-center gap-1.5 pointer-events-none">
              <Move className="w-3 h-3" />
              <span>Drag to move</span>
            </div>
          </div>
        </div>

        {/* Zoom & Adjustment Controls */}
        <div className="space-y-3 pt-1">
          {/* Zoom Slider */}
          <div className="flex items-center gap-3 px-1">
            <button
              type="button"
              onClick={() => setZoom(prev => Math.max(1, prev - 0.2))}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="Zoom out"
            >
              <ZoomOut className="w-4 h-4" />
            </button>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(parseFloat(e.target.value))}
              className="flex-1 h-1.5 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-[#1d4ed8]"
            />
            <button
              type="button"
              onClick={() => setZoom(prev => Math.min(3, prev + 0.2))}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-colors"
              title="Zoom in"
            >
              <ZoomIn className="w-4 h-4" />
            </button>
          </div>

          {/* Secondary Action Buttons (Rotate, Reset) */}
          <div className="flex items-center justify-center gap-3">
            <button
              type="button"
              onClick={handleRotate}
              className="py-1.5 px-3 rounded-full text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCw className="w-3.5 h-3.5" />
              Rotate
            </button>

            <button
              type="button"
              onClick={handleReset}
              className="py-1.5 px-3 rounded-full text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Reset
            </button>
          </div>
        </div>

        {/* Modal Footer Buttons */}
        <div className="flex items-center gap-3 mt-5 pt-3 border-t border-gray-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isProcessing}
            className="flex-1 py-3 rounded-full text-gray-700 bg-gray-100 hover:bg-gray-200 font-semibold text-sm transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSaveCrop}
            disabled={isProcessing}
            className="flex-1 py-3 rounded-full font-bold text-sm text-white bg-[#1d4ed8] hover:bg-[#1e40af] flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer active:scale-[0.98]"
          >
            <Check className="w-4 h-4" />
            <span>{isProcessing ? "Processing..." : "Crop & Save"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
