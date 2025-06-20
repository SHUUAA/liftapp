import React from 'react';

const ImageViewer = ({ 
  imageRef, 
  sampleImageUrl, 
  contrast, 
  brightness, 
  zoom, 
  guideLine 
}) => {
  return (
    <div className="relative bg-gray-100 h-96 overflow-hidden">
      <img
        ref={imageRef}
        src={sampleImageUrl}
        alt="Historical Document"
        className="w-full h-full object-contain cursor-move"
        style={{
          filter: `contrast(${contrast}%) brightness(${brightness}%)`,
          transform: `scale(${zoom / 100})`
        }}
        draggable
      />
      {guideLine && (
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-green-500 pointer-events-none" />
      )}
    </div>
  );
};

export default ImageViewer;