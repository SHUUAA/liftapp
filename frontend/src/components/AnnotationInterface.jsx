import React from 'react';
import NavigationBar from './NavigationBar';
import Toolbar from './Toolbar';
import ImageViewer from './ImageViewer';
import DataTable from './DataTable';

const AnnotationInterface = ({
  // Navigation props
  setCurrentView,
  setCurrentSession,
  connectionStatus,
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
        setCurrentView={setCurrentView}
        setCurrentSession={setCurrentSession}
        connectionStatus={connectionStatus}
        progress={progress}
        handleSubmit={handleSubmit}
      />
      
      <Toolbar
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
      
      <ImageViewer
        imageRef={imageRef}
        sampleImageUrl={sampleImageUrl}
        contrast={contrast}
        brightness={brightness}
        zoom={zoom}
        guideLine={guideLine}
      />
      
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
  );
};

export default AnnotationInterface;