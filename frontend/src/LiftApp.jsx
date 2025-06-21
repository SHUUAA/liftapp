// src/LiftApp.jsx
import React, { useState, useRef, useEffect } from "react";
import HomePage from "./components/HomePage";
import ExamSelection from "./components/ExamSelection";
import AnnotationInterface from "./components/AnnotationInterface";
import { useDatabase } from "./hooks/useDatabase";
import { fields, sampleImageUrl, initialTableRow } from "./utils/constants";

const LiftApp = () => {
  const [currentView, setCurrentView] = useState("home"); // 'home', 'examSelection', 'baptism', 'marriage'
  const [userId, setUserId] = useState("");
  const [currentSession, setCurrentSession] = useState(null);
  const [tableData, setTableData] = useState([initialTableRow]);
  const [activeRow, setActiveRow] = useState(0);
  const [currentField, setCurrentField] = useState("");
  const [progress, setProgress] = useState(0);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  // Toolbar states
  const [guideLine, setGuideLine] = useState(false);
  const [firstCharCapslock, setFirstCharCapslock] = useState(false);
  const [specialCharacters, setSpecialCharacters] = useState(false);
  const [contrast, setContrast] = useState(50);
  const [brightness, setBrightness] = useState(50);
  const [zoom, setZoom] = useState(100);

  const imageRef = useRef(null);
  const fieldRefs = useRef({});

  const {
    connectionStatus,
    createUser,
    createSession,
    saveAnnotations,
    updateSessionProgress,
    submitSession,
  } = useDatabase();

  // Calculate progress
  useEffect(() => {
    const totalFields = tableData.length * (fields.length - 1);
    const filledFields = tableData.reduce((count, row) => {
      return (
        count +
        fields
          .slice(1)
          .filter((field) => row[field.key] && row[field.key].trim() !== "")
          .length
      );
    }, 0);
    const newProgress = Math.round((filledFields / totalFields) * 100);
    setProgress(newProgress);

    if (currentSession?.id) {
      updateSessionProgress(currentSession.id, newProgress);
    }
  }, [tableData, currentSession?.id]);

  // Access platform handler
  const handleAccessPlatform = () => {
    if (!userId.trim()) return;
    setCurrentView("examSelection");
    setShowSuccessToast(true);
    // Hide toast after 5 seconds
    setTimeout(() => setShowSuccessToast(false), 5000);
  };

  // Logout handler
  const handleLogout = () => {
    setCurrentView("home");
    setUserId("");
    setCurrentSession(null);
    setTableData([initialTableRow]);
    setProgress(0);
  };

  // Event handlers
  const handleInputChange = (rowIndex, field, value) => {
    let processedValue = value;
    if (firstCharCapslock && value.length === 1) {
      const currentValue = tableData[rowIndex][field];
      if (currentValue === "") {
        processedValue = value.toUpperCase();
      }
    }

    setTableData((prev) => {
      const updated = [...prev];
      updated[rowIndex] = { ...updated[rowIndex], [field]: processedValue };
      return updated;
    });
  };

  const handleKeyDown = (e, rowIndex, fieldIndex) => {
    if (specialCharacters && e.ctrlKey && e.altKey) {
      const charMap = {
        a: "á",
        A: "Á",
        e: "é",
        E: "É",
        i: "í",
        I: "Í",
        o: "ó",
        O: "Ó",
        u: "ú",
        U: "Ú",
        n: "ñ",
        N: "Ñ",
        c: "ç",
        C: "Ç",
      };

      if (charMap[e.key]) {
        e.preventDefault();
        const field = fields[fieldIndex].key;
        setTableData((prev) => {
          const currentValue = prev[rowIndex][field];
          const newValue = currentValue + charMap[e.key];
          return prev.map((row, index) =>
            index === rowIndex ? { ...row, [field]: newValue } : row
          );
        });
      }
    }

    if (e.key === "Tab" && fieldIndex === fields.length - 1) {
      e.preventDefault();
      addNewRow(rowIndex + 1);
    }
  };

  const addNewRow = (insertIndex = tableData.length) => {
    const newRow = {
      id: Date.now(),
      ...initialTableRow,
    };

    setTableData((prev) => [
      ...prev.slice(0, insertIndex),
      newRow,
      ...prev.slice(insertIndex),
    ]);
    setActiveRow(insertIndex);
  };

  const deleteRow = (rowIndex) => {
    if (tableData.length > 1) {
      setTableData((prev) => prev.filter((_, index) => index !== rowIndex));
      if (activeRow >= tableData.length - 1) {
        setActiveRow(0);
      }
    }
  };

  const resetZoom = () => {
    setZoom(100);
    if (imageRef.current) {
      imageRef.current.style.transform = "translate(0, 0)";
    }
  };

  const handleSubmit = async () => {
    if (currentSession?.id) {
      const saved = await saveAnnotations(currentSession.id, tableData);
      if (saved) {
        const submitted = await submitSession(currentSession.id);
        if (submitted) {
          alert("Session submitted successfully!");
          setCurrentView("examSelection");
          setCurrentSession(null);
          setTableData([initialTableRow]);
        } else {
          alert("Failed to submit session. Please try again.");
        }
      }
    }
  };

  const startExam = async (examType) => {
    await createUser(userId);
    const session = await createSession(userId, examType);
    if (session) {
      setCurrentSession(session);
      setCurrentView(examType);
    } else {
      alert("Failed to create session. Please try again.");
    }
  };

  return (
    <div className="App">
      {currentView === "home" && (
        <HomePage
          userId={userId}
          setUserId={setUserId}
          connectionStatus={connectionStatus}
          onAccessPlatform={handleAccessPlatform}
        />
      )}

      {currentView === "examSelection" && (
        <ExamSelection
          userId={userId}
          startExam={startExam}
          onLogout={handleLogout}
          showSuccessToast={showSuccessToast}
          setShowSuccessToast={setShowSuccessToast}
        />
      )}

      {(currentView === "baptism" || currentView === "marriage") && (
        <AnnotationInterface
          userId={userId}
          setCurrentView={setCurrentView}
          setCurrentSession={setCurrentSession}
          progress={progress}
          handleSubmit={handleSubmit}
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
          imageRef={imageRef}
          sampleImageUrl={sampleImageUrl}
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
      )}
    </div>
  );
};

export default LiftApp;
