
import React, { useState, useRef, useEffect } from 'react';
import { ImageSettings, ImageTask } from '../../types';

const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>;
const MinusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 12h-15" /></svg>;
const ArrowPathIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5"><path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" /></svg>;
const ChevronLeftIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>;
const ChevronRightIcon = () => <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>;

interface ImageViewerProps {
  imageSettings: ImageSettings;
  onImageSettingChange: (setting: keyof Omit<ImageSettings, 'position' | 'zoom'>, value: number) => void;
  onImageZoomChange: (value: number) => void;
  onImagePositionChange: (newPosition: { x: number; y: number }) => void;
  onResetImageSettings: () => void;
  currentImageUrl: string | null;
  currentTaskForDisplay: ImageTask | undefined;
  allImageTasks: ImageTask[];
  currentImageTaskIndex: number;
  onNavigateImage: (direction: 1 | -1, skipLocalSave?: boolean) => Promise<void>;
  imageLoading: boolean;
  toolSettings: { guideLine: boolean };
  examName: string;
  isLoadingImageTasks: boolean;
}

const ImageViewer: React.FC<ImageViewerProps> = ({
  imageSettings,
  onImageSettingChange,
  onImageZoomChange,
  onImagePositionChange,
  onResetImageSettings,
  currentImageUrl,
  currentTaskForDisplay,
  allImageTasks,
  currentImageTaskIndex,
  onNavigateImage,
  imageLoading,
  toolSettings,
  examName,
  isLoadingImageTasks
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!currentImageUrl || !imageContainerRef.current) return;
    // Prevent dragging if the target is an input or button within the image controls area
    if ((e.target as HTMLElement).closest('button, input[type="range"]')) return;
    
    e.preventDefault(); // Important to prevent text selection or other default behaviors
    setIsDragging(true);
    setDragStart({
      x: e.clientX - imageSettings.position.x,
      y: e.clientY - imageSettings.position.y,
    });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !imageContainerRef.current) return;
    e.preventDefault();
    const newX = e.clientX - dragStart.x;
    const newY = e.clientY - dragStart.y;
    onImagePositionChange({ x: newX, y: newY });
  };

  const handleMouseUpOrLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
        e.preventDefault();
        setIsDragging(false);
    }
  };
  
  // Effect to add global mouse move and up listeners when dragging starts
  useEffect(() => {
    const handleGlobalMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const newX = e.clientX - dragStart.x;
      const newY = e.clientY - dragStart.y;
      onImagePositionChange({ x: newX, y: newY });
    };

    const handleGlobalMouseUp = () => {
      if (isDragging) {
        setIsDragging(false);
      }
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, [isDragging, dragStart, onImagePositionChange]);


  return (
    <section className="w-full h-[60%] flex flex-col bg-white shadow-lg rounded-md p-3 overflow-hidden">
      <div className="flex items-center justify-between mb-2 flex-shrink-0">
        <div className="flex items-center space-x-1">
          <button onClick={() => onImageZoomChange(imageSettings.zoom - 10)} className="p-1.5 rounded hover:bg-slate-200 transition-colors" aria-label="Zoom out"><MinusIcon /></button>
          <button onClick={() => onImageZoomChange(imageSettings.zoom + 10)} className="p-1.5 rounded hover:bg-slate-200 transition-colors" aria-label="Zoom in"><PlusIcon /></button>
          <button onClick={onResetImageSettings} className="p-1.5 rounded hover:bg-slate-200 transition-colors" aria-label="Reset view"><ArrowPathIcon /></button>
          <span className="text-xs text-slate-600 w-10 text-center">{imageSettings.zoom}%</span>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span>Contrast:</span>
          <input type="range" min="0" max="200" value={imageSettings.contrast} onChange={e => onImageSettingChange('contrast', parseInt(e.target.value))} className="w-20 h-1 accent-blue-600" aria-label="Adjust contrast"/>
          <span className="w-8 text-center">{imageSettings.contrast}%</span>
        </div>
        <div className="flex items-center space-x-2 text-xs">
          <span>Brightness:</span>
          <input type="range" min="0" max="200" value={imageSettings.brightness} onChange={e => onImageSettingChange('brightness', parseInt(e.target.value))} className="w-20 h-1 accent-blue-600" aria-label="Adjust brightness"/>
           <span className="w-8 text-center">{imageSettings.brightness}%</span>
        </div>
        <div className="flex items-center space-x-2">
          <button onClick={() => onNavigateImage(-1)} disabled={currentImageTaskIndex <= 0 || allImageTasks.length === 0 || imageLoading} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 transition-colors"><ChevronLeftIcon /></button>
          <span className="text-xs text-slate-500">
            Image {allImageTasks.length > 0 ? currentImageTaskIndex + 1 : 0} of {allImageTasks.length}
          </span>
          <button onClick={() => onNavigateImage(1)} disabled={currentImageTaskIndex >= allImageTasks.length - 1 || allImageTasks.length === 0 || imageLoading} className="p-1.5 rounded hover:bg-slate-200 disabled:opacity-50 transition-colors"><ChevronRightIcon /></button>
        </div>
      </div>
      <div 
        ref={imageContainerRef}
        className="flex-grow bg-slate-200 rounded flex items-center justify-center overflow-hidden relative"
        onMouseDown={handleMouseDown}
        onMouseMove={isDragging ? handleMouseMove : undefined} // Only attach if dragging to avoid perf issues
        onMouseUp={handleMouseUpOrLeave}
        onMouseLeave={handleMouseUpOrLeave} // End drag if mouse leaves container
        style={{ cursor: isDragging ? 'grabbing' : (currentImageUrl ? 'grab' : 'default') }}
      >
        {imageLoading && <p className="text-slate-500">Loading image...</p>}
        {!imageLoading && currentImageUrl && currentTaskForDisplay && (
          <img 
            src={currentImageUrl} 
            alt={`Document: ${currentTaskForDisplay.original_filename || currentTaskForDisplay.storage_path}`} 
            className="max-w-none max-h-none object-contain transition-transform duration-0 ease-linear" // No transition during drag
            style={{ 
              transform: `translate(${imageSettings.position.x}px, ${imageSettings.position.y}px) scale(${imageSettings.zoom / 100})`, 
              filter: `contrast(${imageSettings.contrast}%) brightness(${imageSettings.brightness}%)`,
              pointerEvents: 'none' // Important to allow parent div to capture mouse events
            }}
            draggable="false" 
          />
        )}
        {!imageLoading && !currentImageUrl && currentTaskForDisplay && (
             <div className="text-center text-slate-500 p-4">
                <p className="font-semibold">Image Preview Unavailable</p>
                <p className="text-sm">Could not load image: {currentTaskForDisplay.original_filename || currentTaskForDisplay.storage_path}</p>
            </div>
        )}
        {!imageLoading && !currentTaskForDisplay && allImageTasks.length === 0 && !isLoadingImageTasks && (
            <div className="text-center text-slate-500 p-4">
                <p className="font-semibold">No Images Available</p>
                <p className="text-sm">There are no images assigned to this exam: {examName}.</p>
            </div>
        )}
        {toolSettings.guideLine && (<div className="absolute top-1/2 left-0 w-full h-0.5 bg-green-500 opacity-70 transform -translate-y-1/2 pointer-events-none"></div>)}
      </div>
      <div className="text-right text-xs text-slate-500 pt-1 flex-shrink-0">
        {currentTaskForDisplay ? (currentTaskForDisplay.original_filename || currentTaskForDisplay.storage_path) : (allImageTasks.length > 0 && !isLoadingImageTasks ? "Loading image info..." : (isLoadingImageTasks ? "Loading..." :`No image loaded for ${examName}`))}
      </div>
    </section>
  );
};

export default ImageViewer;
