import React from 'react';
import NavigationBar from './NavigationBar';
import ImageViewer from './ImageViewer';
import DataTable from './DataTable';

const AnnotationInterface = ({
  // Navigation props
  userId,
  setCurrentView,
  setCurrentSession,
  progress,
  handleSubmit,
  
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
  resetZoom,
  
  // Image viewer props
  imageRef,
  sampleImageUrl,
  
  // Data table props
  tableData,
  activeRow,
  setActiveRow,
  fields,
  fieldRefs,
  handleInputChange,
  handleKeyDown,
  setCurrentField,
  deleteRow,
  addNewRow,
  currentSession,
  currentView
}) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <NavigationBar
        userId={userId}
        setCurrentView={setCurrentView}
        setCurrentSession={setCurrentSession}
        progress={progress}
        handleSubmit={handleSubmit}
        hasUnsavedChanges={true}
        guideLine={guideLine}
        setGuideLine={setGuideLine}
        firstCharCapslock={firstCharCapslock}
        setFirstCharCapslock={setFirstCharCapslock}
        specialCharacters={specialCharacters}
        setSpecialCharacters={setSpecialCharacters}
        contrast={contrast}
        setContrast={setContrast}
        brightness={brightness}
        setBrightness={setBrightness}
        zoom={zoom}
        setZoom={setZoom}
        resetZoom={resetZoom}
      />
      
      {/* Image Viewer */}
      <div className="p-4">
        <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
          <ImageViewer
            imageRef={imageRef}
            sampleImageUrl={sampleImageUrl}
            contrast={contrast}
            brightness={brightness}
            zoom={zoom}
            guideLine={guideLine}
          />
        </div>
      </div>
      
      {/* Bottom Navigation Tabs */}
      <div className="px-4 pb-4">
        <div className="bg-white rounded-lg shadow-sm border">
          {/* Tab Navigation */}
          <div className="flex items-center justify-between p-3 border-b bg-gray-50 rounded-t-lg">
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">Bur-es</span>
              <button className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium">
                Table
              </button>
              <button className="text-gray-500 px-3 py-1 rounded text-sm hover:bg-gray-100">
                Previous
              </button>
              <button className="text-gray-500 px-3 py-1 rounded text-sm hover:bg-gray-100">
                Next
              </button>
              <button className="text-gray-500 px-3 py-1 rounded text-sm hover:bg-gray-100">
                Exception Image
              </button>
              <button className="text-gray-500 px-3 py-1 rounded text-sm hover:bg-gray-100">
                Show All
              </button>
            </div>
            <div className="text-sm text-gray-600">
              1/1 Images
            </div>
          </div>
          
          {/* Data Entry Section */}
          <div className="p-3">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-gray-700">
                Data Entry Table <span className="text-gray-500">1 row | 0% complete</span>
              </h3>
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => addNewRow()}
                  className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 transition-colors flex items-center space-x-1"
                >
                  <span>+ Add Row</span>
                </button>
                <span className="text-sm text-gray-500">Or press Tab in last field to add row</span>
              </div>
            </div>
            
            <DataTable
              tableData={tableData}
              activeRow={activeRow}
              setActiveRow={setActiveRow}
              fields={fields}
              fieldRefs={fieldRefs}
              handleInputChange={handleInputChange}
              handleKeyDown={handleKeyDown}
              setCurrentField={setCurrentField}
              deleteRow={deleteRow}
              addNewRow={addNewRow}
              currentSession={currentSession}
              currentView={currentView}
            />
          </div>
          
          {/* Statistics Footer */}
          <div className="px-3 py-2 bg-gray-50 border-t rounded-b-lg">
            <div className="flex items-center justify-between text-xs text-gray-500">
              <div className="flex items-center space-x-4">
                <span>📊 Statistics:</span>
                <span>Keystrokes: 0</span>
                <span>Backspaces: 0</span>
                <span>Edits: 0</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-green-400 rounded-full"></div>
                  <span>Filled cells: 1</span>
                </div>
                <div className="flex items-center space-x-1">
                  <div className="w-3 h-3 bg-purple-400 rounded-full"></div>
                  <span>Empty cells: 16</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnnotationInterface;