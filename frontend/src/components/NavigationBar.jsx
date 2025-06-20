// src/components/NavigationBar.jsx
import React, { useState } from 'react';
import { ArrowLeft, HelpCircle, AlertTriangle, Plus, Minus, RotateCcw, Menu, X } from 'lucide-react';

const NavigationBar = ({ 
  userId,
  setCurrentView, 
  setCurrentSession, 
  progress, 
  handleSubmit,
  hasUnsavedChanges = true,
  // Toolbar props
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileControlsOpen, setMobileControlsOpen] = useState(false);

  return (
    <div className="bg-white shadow-sm border-b">
      {/* Main Navigation Bar */}
      <div className="px-2 sm:px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Side - Mobile & Desktop */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Back Button */}
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to go back? Unsaved changes will be lost.')) {
                  setCurrentView('examSelection');
                  setCurrentSession(null);
                }
              }}
              className="flex items-center space-x-1 sm:space-x-2 text-white bg-blue-600 hover:bg-blue-700 px-2 sm:px-4 py-2 rounded-md transition-colors text-sm"
            >
              <ArrowLeft size={16} />
              <span className="hidden sm:inline font-medium">Back to Dashboard</span>
              <span className="sm:hidden font-medium">Back</span>
            </button>
            
            {/* User Info - Hidden on mobile */}
            <div className="hidden md:block text-sm text-gray-600">
              User: {userId}
            </div>
            

            {/* Desktop Toolbar Controls */}
            <div className="hidden lg:flex items-center space-x-4 ml-8">
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={guideLine}
                  onChange={(e) => setGuideLine(e.target.checked)}
                  className="rounded border-gray-300" 
                />
                <span>Guide Line</span>
              </label>
              
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={firstCharCapslock}
                  onChange={(e) => setFirstCharCapslock(e.target.checked)}
                  className="rounded border-gray-300" 
                />
                <span>First Char Capslock</span>
              </label>
              
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={specialCharacters}
                  onChange={(e) => setSpecialCharacters(e.target.checked)}
                  className="rounded border-gray-300" 
                />
                <span>Special Characters</span>
              </label>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden p-2 border border-gray-300 rounded hover:bg-gray-100"
            >
              {mobileMenuOpen ? <X size={16} /> : <Menu size={16} />}
            </button>
          </div>
          
          {/* Right Side */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            {/* Progress - Responsive */}
            <div className="text-xs sm:text-sm text-gray-600">
              <span className="hidden sm:inline">Rows: 1 | </span>
              <span>Progress: {progress}%</span>
            </div>
            
            {/* Submit Button */}
            <button
              onClick={handleSubmit}
              className="bg-green-600 text-white px-2 sm:px-4 py-2 rounded-md hover:bg-green-700 transition-colors font-medium text-sm"
            >
              <span className="hidden sm:inline">Submit</span>
            </button>
            
            {/* Help Button */}
            <button className="text-white bg-blue-600 hover:bg-blue-700 px-2 sm:px-3 py-1.5 rounded-md transition-colors flex items-center space-x-1 sm:space-x-2">
              <HelpCircle size={15} />
              <span className="hidden sm:inline font-medium">Help</span>
            </button>
          </div>
        </div>

        {/* Mobile Menu Dropdown */}
        {mobileMenuOpen && (
          <div className="lg:hidden mt-3 p-3 bg-gray-50 rounded-lg border">
            {/* User Info on Mobile */}
            <div className="md:hidden text-sm text-gray-600 mb-3">
              User: {userId} (PHCB3242)
            </div>
            
            {/* Unsaved Changes on Mobile */}
            {hasUnsavedChanges && (
              <div className="sm:hidden flex items-center space-x-2 text-orange-600 mb-3">
                <AlertTriangle size={16} />
                <span className="text-sm font-medium">Unsaved changes</span>
              </div>
            )}

            {/* Mobile Toolbar Controls */}
            <div className="space-y-3">
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={guideLine}
                  onChange={(e) => setGuideLine(e.target.checked)}
                  className="rounded border-gray-300" 
                />
                <span>Guide Line</span>
              </label>
              
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={firstCharCapslock}
                  onChange={(e) => setFirstCharCapslock(e.target.checked)}
                  className="rounded border-gray-300" 
                />
                <span>First Char Capslock</span>
              </label>
              
              <label className="flex items-center space-x-2 text-sm">
                <input 
                  type="checkbox" 
                  checked={specialCharacters}
                  onChange={(e) => setSpecialCharacters(e.target.checked)}
                  className="rounded border-gray-300" 
                />
                <span>Special Characters</span>
              </label>
            </div>

            {/* Page Navigation on Mobile */}
            <div className="md:hidden mt-3 flex items-center space-x-2 text-sm text-gray-600">
              <span>Page</span>
              <input 
                type="number" 
                defaultValue="1" 
                className="w-12 px-2 py-1 border border-gray-300 rounded text-center"
              />
              <span>of 1</span>
            </div>
          </div>
        )}
      </div>
      
      {/* Second Row - Image Controls */}
      <div className="bg-gray-50 px-2 sm:px-4 py-2 border-t">
        {/* Desktop Controls */}
        <div className="hidden md:flex items-center justify-between">
          {/* Left - Zoom Controls */}
          <div className="flex items-center space-x-3">
            <button 
              onClick={() => setZoom(Math.max(zoom - 25, 25))}
              className="p-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors w-8 h-8 flex items-center justify-center"
            >
              <Minus size={16} />
            </button>
            <button 
              onClick={() => setZoom(Math.min(zoom + 25, 400))}
              className="p-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors w-8 h-8 flex items-center justify-center"
            >
              <Plus size={16} />
            </button>
            <button 
              onClick={resetZoom}
              className="p-1 border border-gray-300 rounded hover:bg-gray-100 transition-colors w-8 h-8 flex items-center justify-center"
            >
              <RotateCcw size={16} />
            </button>
            <span className="text-sm text-gray-600 font-medium">{Math.round(zoom / 100 * 61.2)}%</span>
          </div>
          
          {/* Center - Contrast & Brightness */}
          <div className="flex items-center space-x-8">
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">Contrast:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={contrast}
                onChange={(e) => setContrast(e.target.value)}
                className="w-32 accent-blue-600"
              />
              <span className="text-sm text-gray-600 w-8">{contrast}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="text-sm text-gray-600">Brightness:</span>
              <input
                type="range"
                min="0"
                max="100"
                value={brightness}
                onChange={(e) => setBrightness(e.target.value)}
                className="w-32 accent-blue-600"
              />
              <span className="text-sm text-gray-600 w-8">{brightness}</span>
            </div>
          </div>
          
          {/* Right - Page Info */}
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">Page</span>
            <input 
              type="number" 
              defaultValue="1" 
              className="w-12 px-2 py-1 border border-gray-300 rounded text-center text-sm"
            />
            <span className="text-sm text-gray-600">of 1</span>
          </div>
        </div>

        {/* Mobile/Tablet Controls */}
        <div className="md:hidden">
          <div className="flex items-center justify-between mb-3">
            {/* Zoom Controls */}
            <div className="flex items-center space-x-2">
              <button 
                onClick={() => setZoom(Math.max(zoom - 25, 25))}
                className="p-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                <Minus size={16} />
              </button>
              <button 
                onClick={() => setZoom(Math.min(zoom + 25, 400))}
                className="p-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                <Plus size={16} />
              </button>
              <button 
                onClick={resetZoom}
                className="p-2 border border-gray-300 rounded hover:bg-gray-100 transition-colors"
              >
                <RotateCcw size={16} />
              </button>
              <span className="text-sm text-gray-600 font-medium">{Math.round(zoom / 100 * 61.2)}%</span>
            </div>

            {/* Controls Toggle */}
            <button
              onClick={() => setMobileControlsOpen(!mobileControlsOpen)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {mobileControlsOpen ? 'Hide Controls' : 'Show Controls'}
            </button>
          </div>

          {/* Mobile Controls Dropdown */}
          {mobileControlsOpen && (
            <div className="space-y-4">
              {/* Contrast */}
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 w-20">Contrast:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={contrast}
                  onChange={(e) => setContrast(e.target.value)}
                  className="flex-1 accent-blue-600"
                />
                <span className="text-sm text-gray-600 w-8">{contrast}</span>
              </div>
              
              {/* Brightness */}
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600 w-20">Brightness:</span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={brightness}
                  onChange={(e) => setBrightness(e.target.value)}
                  className="flex-1 accent-blue-600"
                />
                <span className="text-sm text-gray-600 w-8">{brightness}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NavigationBar;