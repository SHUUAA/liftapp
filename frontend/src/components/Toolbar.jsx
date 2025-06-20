import React from 'react';
import { Plus, Minus, RotateCcw } from 'lucide-react';

const Toolbar = ({
  guideLine,
  setGuideLine,
  firstCharCapslock,
  setFirstCharCapslock,
  specialCharacters,
  setSpecialCharacters,
  contrast,
  setContrast,
  brightness,
  setBrightness,
  zoom,
  setZoom,
  resetZoom
}) => {
  return (
    <div className="mt-3 flex items-center space-x-6 text-sm">
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={guideLine}
          onChange={(e) => setGuideLine(e.target.checked)}
        />
        <span>Guide Line</span>
      </label>
      
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={firstCharCapslock}
          onChange={(e) => setFirstCharCapslock(e.target.checked)}
        />
        <span>First Char Capslock</span>
      </label>
      
      <label className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={specialCharacters}
          onChange={(e) => setSpecialCharacters(e.target.checked)}
        />
        <span>Special Characters</span>
      </label>
      
      <div className="flex items-center space-x-2">
        <span>Contrast:</span>
        <input
          type="range"
          min="0"
          max="100"
          value={contrast}
          onChange={(e) => setContrast(e.target.value)}
          className="w-20"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <span>Brightness:</span>
        <input
          type="range"
          min="0"
          max="100"
          value={brightness}
          onChange={(e) => setBrightness(e.target.value)}
          className="w-20"
        />
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={() => setZoom(Math.min(zoom + 25, 400))}
          className="p-1 border rounded hover:bg-gray-100"
        >
          <Plus size={16} />
        </button>
        <button
          onClick={() => setZoom(Math.max(zoom - 25, 25))}
          className="p-1 border rounded hover:bg-gray-100"
        >
          <Minus size={16} />
        </button>
        <button
          onClick={resetZoom}
          className="p-1 border rounded hover:bg-gray-100"
        >
          <RotateCcw size={16} />
        </button>
        <span>{zoom}%</span>
      </div>
    </div>
  );
};

export default Toolbar;