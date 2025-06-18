import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";
import documentImage from "../assets/document.jpeg";

export default function FinalExam() {
  const navigate = useNavigate();
  const imageRef = useRef(null);
  const containerRef = useRef(null);
  const sessionStartTime = useRef(Date.now());
  const autoSaveInterval = useRef(null);

  // Image controls
  const [zoom, setZoom] = useState(61.16);
  const [contrast, setContrast] = useState(50);
  const [brightness, setBrightness] = useState(50);
  const [imageError, setImageError] = useState(false);

  // Image panning
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Document navigation
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages] = useState(1);
  const [documents] = useState([
    { id: "004413935_00143", name: "document.jpeg", status: "active" },
  ]);

  // User and annotation data
  const [user, setUser] = useState(null);
  const [annotationId, setAnnotationId] = useState(null);
  const [sessionId, setSessionId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [showInstructions, setShowInstructions] = useState(false);


  // Toolbar state
  const [toolbarState, setToolbarState] = useState({
    verticalMode: false,
    guideLine: false,
    zoneBox: false,
    topZone: false,
    moveByCell: false,
    editMode: false,
    movingLayer: true,
    firstCharCapsLock: false,
    pressSpacebar: false,
    dictionary: false,
    ignoreCase: false,
    toolTip: false,
    onlyOneColumn: false,
    specialCharacters: false,
  });

  // Annotation data
  const [records, setRecords] = useState([{
    id: 1,
    image: "004413935_00143",
    language: "",
    event_d: "",
    event_m: "",
    event_y: "",
    given: "",
    surname: "",
    sex: "",
    age: "",
    death_d: "",
    death_m: "",
    death_y: "",
    fa_given: "",
    fa_surname: "",
    mo_given: "",
    mo_surname: "",
    sp_given: "",
    sp_surname: "",
  }]);

  const [selectedRowId, setSelectedRowId] = useState(1);
  const recordData = records.find(r => r.id === selectedRowId) || records[0];


  const specialCharMap = {
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
    ü: "ü",
    Ü: "Ü",
  };

  const handleSpecialCharInput = (e, field) => {
  if (
    toolbarState.specialCharacters &&
    e.ctrlKey &&
    e.altKey &&
    !e.metaKey &&
    specialCharMap[e.key]
  ) {
    e.preventDefault();

    const input = e.target;
    const cursorPos = input.selectionStart;
    const before = input.value.slice(0, cursorPos);
    const after = input.value.slice(cursorPos);
    const newChar = specialCharMap[e.key];

    const newValue = before + newChar + after;

    // Use the updated handleInputChange that works with records
    handleInputChange(field, newValue);

    setTimeout(() => {
      input.selectionStart = input.selectionEnd = cursorPos + 1;
    }, 0);
  }
};

  // Initialize user and load existing annotation
  useEffect(() => {
    initializeAnnotation();
    setupAutoSave();

    return () => {
      if (autoSaveInterval.current) {
        clearInterval(autoSaveInterval.current);
      }
      endSession();
    };
  }, []);

  // FIXED initializeAnnotation function
  const initializeAnnotation = async () => {
    try {
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        navigate("/auth");
        return;
      }

      setUser(user);

      // Get user profile to get custom user_id
      const { data: userProfile, error: profileError } = await supabase
        .from("user_profiles")
        .select("user_id")
        .eq("auth_user_id", user.id)
        .single();

      if (profileError || !userProfile) {
        console.error("User profile not found:", profileError);
        navigate("/auth");
        return;
      }

      const userId = userProfile.user_id; // Use custom user_id from profile

      let currentAnnotationId = null;

      // Check for existing annotation
      const { data: existingAnnotation, error: fetchError } = await supabase
        .from("annotations")
        .select("*")
        .eq("auth_user_id", user.id)
        .eq("image_name", "004413935_00143")
        .maybeSingle();

      if (existingAnnotation && !fetchError) {
        // Load existing annotation
        currentAnnotationId = existingAnnotation.id;
        setAnnotationId(currentAnnotationId);

        setRecordData({
          image: existingAnnotation.image_name,
          language: existingAnnotation.language || "",
          event_d: existingAnnotation.event_d || "",
          event_m: existingAnnotation.event_m || "",
          event_y: existingAnnotation.event_y || "",
          given: existingAnnotation.given || "",
          surname: existingAnnotation.surname || "",
          sex: existingAnnotation.sex || "",
          age: existingAnnotation.age || "",
          death_d: existingAnnotation.death_d || "",
          death_m: existingAnnotation.death_m || "",
          death_y: existingAnnotation.death_y || "",
          fa_given: existingAnnotation.fa_given || "",
          fa_surname: existingAnnotation.fa_surname || "",
          mo_given: existingAnnotation.mo_given || "",
          mo_surname: existingAnnotation.mo_surname || "",
          sp_given: existingAnnotation.sp_given || "",
          sp_surname: existingAnnotation.sp_surname || "",
        });

        console.log("Loaded existing annotation:", currentAnnotationId);
      } else {
        // Create new annotation
        const { data: newAnnotation, error: createError } = await supabase
          .from("annotations")
          .insert([
            {
              user_id: userId, // Custom user ID
              auth_user_id: user.id, // Auth UUID for RLS
              image_name: "004413935_00143",
              status: "in_progress",
            },
          ])
          .select()
          .single();

        if (createError) {
          console.error("Error creating annotation:", createError);
          return;
        }

        currentAnnotationId = newAnnotation.id;
        setAnnotationId(currentAnnotationId);
        console.log("Created new annotation:", currentAnnotationId);
      }

      // NOW create session with the valid annotation ID
      if (currentAnnotationId) {
        const { data: newSession, error: sessionError } = await supabase
          .from("annotation_sessions")
          .insert([
            {
              annotation_id: currentAnnotationId, // ← Now this has a valid ID!
              user_id: userId, // Custom user ID
              auth_user_id: user.id, // Auth UUID for RLS
              zoom_level: zoom,
              pan_x: panX,
              pan_y: panY,
              contrast: contrast,
              brightness: brightness,
              started_at: new Date().toISOString(),
            },
          ])
          .select()
          .single();

        if (sessionError) {
          console.error("Error creating session:", sessionError);
        } else {
          setSessionId(newSession.id);
          console.log(
            "Created session:",
            newSession.id,
            "for annotation:",
            currentAnnotationId
          );
        }
      }
    } catch (error) {
      console.error("Error initializing annotation:", error);
    }
  };

  const setupAutoSave = () => {
    autoSaveInterval.current = setInterval(() => {
      saveAnnotation(false);
    }, 30000); // Auto-save every 30 seconds
  };

  const calculateCompletionPercentage = useCallback(() => {
    const fields = Object.values(recordData);
    const filledFields = fields.filter(
      (field) => field && field.toString().trim() !== ""
    ).length;
    return Math.round((filledFields / fields.length) * 100);
  }, [recordData]);

  const saveAnnotation = async (isSubmission = false) => {
    if (!annotationId || !user) return;

    setSaving(true);
    try {
      const completionPercentage = calculateCompletionPercentage();
      const timeSpent = Math.floor(
        (Date.now() - sessionStartTime.current) / 1000
      );

      const updateData = {
        language: recordData.language,
        event_d: recordData.event_d,
        event_m: recordData.event_m,
        event_y: recordData.event_y,
        given: recordData.given,
        surname: recordData.surname,
        sex: recordData.sex,
        age: recordData.age,
        death_d: recordData.death_d,
        death_m: recordData.death_m,
        death_y: recordData.death_y,
        fa_given: recordData.fa_given,
        fa_surname: recordData.fa_surname,
        mo_given: recordData.mo_given,
        mo_surname: recordData.mo_surname,
        sp_given: recordData.sp_given,
        sp_surname: recordData.sp_surname,
        completion_percentage: completionPercentage,
        time_spent_seconds: timeSpent,
        status: isSubmission ? "completed" : "in_progress",
        updated_at: new Date().toISOString(),
        ...(isSubmission && { submitted_at: new Date().toISOString() }),
      };

      const { error } = await supabase
        .from("annotations")
        .update(updateData)
        .eq("id", annotationId);

      if (error) {
        console.error("Error saving annotation:", error);
        return false;
      }

      // Update session
      if (sessionId) {
        await supabase
          .from("annotation_sessions")
          .update({
            zoom_level: zoom,
            pan_x: panX,
            pan_y: panY,
            contrast: contrast,
            brightness: brightness,
            duration_seconds: timeSpent,
          })
          .eq("id", sessionId);
      }

      setLastSaved(new Date());
      return true;
    } catch (error) {
      console.error("Error saving annotation:", error);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const endSession = async () => {
    if (sessionId) {
      const duration = Math.floor(
        (Date.now() - sessionStartTime.current) / 1000
      );
      await supabase
        .from("annotation_sessions")
        .update({
          ended_at: new Date().toISOString(),
          duration_seconds: duration,
        })
        .eq("id", sessionId);
    }
  };

  const handleSubmit = async () => {
    const success = await saveAnnotation(true);
    if (success) {
      alert("Annotation submitted successfully!");
      navigate("/");
    } else {
      alert("Error submitting annotation. Please try again.");
    }
  };

  const toggleToolbar = (key) => {
    setToolbarState((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleInputChange = (field, value) => {
    let newValue = value;

    if (
      toolbarState.firstCharCapsLock &&
      typeof value === "string" &&
      value.length > 0
    ) {
      newValue = value.charAt(0).toUpperCase() + value.slice(1);
    }

    setRecords((prev) => 
      prev.map(record => 
        record.id === selectedRowId 
          ? { ...record, [field]: newValue }
          : record
      )
    );
  };

  const addNewRow = () => {
  const newRecord = {
    id: Date.now(),
    image: "004413935_00143",
    language: "", event_d: "", event_m: "", event_y: "",
    given: "", surname: "", sex: "", age: "",
    death_d: "", death_m: "", death_y: "",
    fa_given: "", fa_surname: "", mo_given: "", mo_surname: "",
    sp_given: "", sp_surname: "",
  };
  setRecords(prev => [...prev, newRecord]);
  setSelectedRowId(newRecord.id);
};

const deleteRow = (recordId) => {
  if (records.length > 1) {
    setRecords(prev => prev.filter(record => record.id !== recordId));
    if (selectedRowId === recordId) {
      setSelectedRowId(records[0]?.id || 1);
    }
  }
};

  // Image controls
  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 10, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 10, 10));
  const handleZoomReset = () => {
    setZoom(100);
    setPanX(0);
    setPanY(0);
  };

  // Image panning
  const handleMouseDown = (e) => {
    if (e.button === 0) {
      // Left mouse button
      setIsDragging(true);
      setDragStart({ x: e.clientX - panX, y: e.clientY - panY });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPanX(e.clientX - dragStart.x);
      setPanY(e.clientY - dragStart.y);
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Navigation functions
  const goBackToDashboard = () => {
    endSession();
    navigate("/");
  };

  const handlePrevious = () => {
    if (currentPage > 1) {
      setCurrentPage((prev) => prev - 1);
    }
  };

  const handleNext = () => {
    if (currentPage < totalPages) {
      setCurrentPage((prev) => prev + 1);
    }
  };

  // Auto-save when data changes
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (annotationId) {
        saveAnnotation(false);
      }
    }, 2000); // Save 2 seconds after user stops typing

    return () => clearTimeout(timeoutId);
  }, [recordData]);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Top Toolbar */}
      <div className="bg-gray-200 border-b border-gray-300 p-2">
        <div className="flex items-center justify-between">
          {/* Left side - Back button and controls */}
          <div className="flex items-center space-x-4">
            {/* Back Button */}
            <button
              onClick={goBackToDashboard}
              className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition duration-200 flex items-center space-x-2"
            >
              <span>←</span>
              <span>Back to Dashboard</span>
            </button>

            {/* Save Status */}
            <div className="flex items-center space-x-2 text-sm">
              {saving ? (
                <span className="text-orange-600">💾 Saving...</span>
              ) : lastSaved ? (
                <span className="text-green-600">
                  ✅ Saved {lastSaved.toLocaleTimeString()}
                </span>
              ) : (
                <span className="text-gray-500">⏳ Not saved</span>
              )}
            </div>

            <div className="flex items-center space-x-2 text-sm">
              
              {/* Toolbar checkboxes */}
              <label className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={toolbarState.guideLine}
                  onChange={() => toggleToolbar("guideLine")}
                  className="w-4 h-4"
                />
                <span>Guide Line</span>
              </label>

              <label className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={toolbarState.firstCharCapsLock}
                  onChange={() => toggleToolbar("firstCharCapsLock")}
                  className="w-4 h-4"
                />
                <span>First Char Capslock</span>
              </label>

              <label className="flex items-center space-x-1">
                <input
                  type="checkbox"
                  checked={toolbarState.specialCharacters}
                  onChange={() => toggleToolbar("specialCharacters")}
                  className="w-4 h-4"
                />
                <span>Special Characters</span>
              </label>
            </div>
          </div>

          {/* Right side controls */}
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-600">
              Progress: {calculateCompletionPercentage()}%
            </span>
              
            <button
              onClick={handleSubmit}
              disabled={saving}
              className="bg-green-500 text-white px-6 py-2 rounded-lg hover:bg-green-600 disabled:opacity-50 transition duration-200"
            >
              {saving ? "Submitting..." : "Submit"}
            </button>
            <button
              onClick={() => setShowInstructions(true)}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600 transition duration-200">
              📖 Help
            </button>
          </div>
        </div>
      </div>

      {/* Control Panel */}
      <div className="bg-gray-50 border-b border-gray-300 p-2">
        <div className="flex items-center justify-between">
          {/* Zoom and controls */}
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <button
                onClick={handleZoomReset}
                className="w-8 h-8 bg-gray-200 border rounded hover:bg-gray-300"
                title="Reset Zoom & Pan"
              >
                ↺
              </button>
              <button
                onClick={handleZoomIn}
                className="w-8 h-8 bg-gray-200 border rounded hover:bg-gray-300"
                title="Zoom In"
              >
                +
              </button>
              <button
                onClick={handleZoomOut}
                className="w-8 h-8 bg-gray-200 border rounded hover:bg-gray-300"
                title="Zoom Out"
              >
                -
              </button>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{zoom.toFixed(1)}%</span>
            </div>
          </div>

          

          {/* Contrast and Brightness */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <span className="text-sm">Contrast</span>
              <input
                type="range"
                min="0"
                max="100"
                value={contrast}
                onChange={(e) => setContrast(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-xs text-gray-500 w-8">{contrast}</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="text-sm">Brightness</span>
              <input
                type="range"
                min="0"
                max="100"
                value={brightness}
                onChange={(e) => setBrightness(Number(e.target.value))}
                className="w-24"
              />
              <span className="text-xs text-gray-500 w-8">{brightness}</span>
            </div>
          </div>

          {/* Page navigation */}
          <div className="flex items-center space-x-2">
            <span className="text-sm">Page</span>
            <input
              type="number"
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              className="w-12 px-1 py-1 border rounded text-center text-sm"
              min="1"
              max={totalPages}
            />
            <span className="text-sm">of {totalPages}</span>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Document Viewer */}
        <div
          ref={containerRef}
          className="flex-1 bg-white border-r border-gray-300 relative overflow-hidden cursor-move"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div className="relative w-full h-full">
            {toolbarState.guideLine && (
              <div className="absolute top-1/2 left-0 w-full h-0.5 bg-green-500 opacity-70 pointer-events-none z-10"></div>
            )}

            <div
              className="absolute top-0 left-0 w-full h-full"
              style={{ transform: `translate(${panX}px, ${panY}px)` }}
            >
              <div
                style={{
                  transform: `scale(${zoom / 100})`,
                  transformOrigin: "center center",
                  position: "relative",
                }}
              >
                {!imageError ? (
                  <img
                    ref={imageRef}
                    src={documentImage}
                    alt="Historical Document"
                    className="max-w-none shadow-lg select-none"
                    style={{
                      filter: `contrast(${contrast + 50}%) brightness(${
                        brightness + 50
                      }%)`,
                    }}
                    onError={() => setImageError(true)}
                    draggable={false}
                  />
                ) : (
                  <div
                    className="bg-gray-50 border-2 border-dashed border-gray-300 p-8 text-center"
                    style={{ width: "600px", height: "800px" }}
                  >
                    <div className="flex flex-col items-center justify-center h-full">
                      <div className="text-gray-500 mb-4">
                        <svg
                          className="w-16 h-16 mx-auto"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <p className="text-gray-600 text-lg">Document Image</p>
                      <p className="text-gray-500 text-sm">
                        Place your image in /src/assets/document.jpeg
                      </p>
                      <button
                        onClick={() => setImageError(false)}
                        className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                      >
                        Retry Loading Image
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Navigation */}
      <div className="bg-gray-200 border-t border-gray-300 p-2">
        <div className="flex items-center space-x-4">
          <span className="text-sm">Bur-es</span>
          <button className="px-3 py-1 bg-blue-500 text-white rounded text-sm hover:bg-blue-600">
            Table
          </button>
          <button
            onClick={handlePrevious}
            disabled={currentPage <= 1}
            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400 disabled:opacity-50"
          >
            Previous
          </button>
          <button
            onClick={handleNext}
            disabled={currentPage >= totalPages}
            className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400 disabled:opacity-50"
          >
            Next
          </button>
          <button className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400">
            Exception Image
          </button>
          <button className="px-3 py-1 bg-gray-300 text-gray-700 rounded text-sm hover:bg-gray-400">
            Show All
          </button>
          <span className="text-sm ml-auto">
            {currentPage}/{totalPages} Images
          </span>
        </div>
      </div>

      {/* Data Entry Table */}
      <div className="bg-white border-t border-gray-300 p-2">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100">
                <th className="border border-gray-300 px-2 py-1 text-left">
                  [Image]
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Language
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Event_D
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Event_M
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Event_Y
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Given
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Surname
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Sex
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Age
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Death_D
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Death_M
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Death_Y
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Fa_Given
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Fa_Surname
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Mo_Given
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Mo_Surname
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Sp_Given
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Sp_Surname
                </th>
              </tr>
            </thead>
            <tbody>
            {records.map((record, index) => (
              <tr key={record.id} className={selectedRowId === record.id ? "bg-yellow-100" : "bg-white"}>
                {Object.entries(record).filter(([key]) => key !== 'id').map(([key, value]) => (
                  <td key={key} className={`border border-gray-300 px-2 py-1 ${value ? "bg-green-200" : ""}`}>
                    <div className="flex items-center">
                      <input
                        type="text"
                        value={value}
                        onChange={(e) => handleInputChange(key, e.target.value, record.id)}
                        onKeyDown={(e) => {
                          handleSpecialCharInput(e, key);
                          if (e.key === 'Tab' && !e.shiftKey && key === 'sp_surname') {
                            e.preventDefault();
                            addNewRow();
                          }
                        }}
                        onFocus={() => setSelectedRowId(record.id)}
                        className="w-full bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                        placeholder={key === "image" ? "Image ID" : `Enter ${key}`}
                      />
                      {key === 'image' && records.length > 1 && (
                        <button
                          onClick={() => deleteRow(record.id)}
                          className="ml-1 text-red-500 hover:text-red-700 text-xs"
                          title="Delete row"
                        >
                          ×
                        </button>
                      )}
                    </div>
                  </td>
                ))}
              </tr>
            ))}
            </tbody>
          </table>
        </div>
       
      </div>
      {/* ADD MODAL HERE */}
      {showInstructions && (
        <div className="fixed inset-0 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-[#f5eedb] rounded-lg shadow-xl p-6 max-w-4xl max-h-[80vh] overflow-y-auto">
            <button 
              onClick={() => setShowInstructions(false)}
              className="float-right text-gray-500 hover:text-gray-700 text-xl font-bold"
            >
              ×
            </button>
            
            <div className="prose prose-sm max-w-none pr-8">
              <h1 className="text-2xl font-bold mb-6">Document Annotation Tool - User Instructions</h1>
              
              <h2 className="text-xl font-semibold mb-4">Overview</h2>
              <p className="mb-6">This tool allows you to annotate historical documents by extracting and entering data into structured fields while viewing the document image.</p>
              
              <hr className="my-6" />
              
              <h2 className="text-xl font-semibold mb-4">Toolbar Features</h2>
              
              <h3 className="text-lg font-semibold mb-3">Image Enhancement Checkboxes</h3>
              
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Guide Line</h4>
                <ul className="list-disc pl-6 mb-2">
                  <li><strong>When checked:</strong> Shows a horizontal green line across the middle of the document image</li>
                  <li><strong>Purpose:</strong> Helps align your reading and maintain focus on specific lines</li>
                  <li><strong>Use when:</strong> You need a visual guide to track text lines accurately</li>
                </ul>
              </div>

              <div className="mb-4">
                <h4 className="font-semibold mb-2">First Char Capslock</h4>
                <ul className="list-disc pl-6 mb-2">
                  <li><strong>When checked:</strong> Automatically capitalizes the first letter of any text you type</li>
                  <li><strong>Purpose:</strong> Ensures proper capitalization for names and proper nouns</li>
                  <li><strong>Use when:</strong> Entering names, places, or any text that should start with a capital letter</li>
                  <li><strong>Note:</strong> This applies to ALL text fields when enabled</li>
                </ul>
              </div>

              <div className="mb-6">
                <h4 className="font-semibold mb-2">Special Characters</h4>
                <ul className="list-disc pl-6 mb-2">
                  <li><strong>When checked:</strong> Enables special character input using keyboard shortcuts (Ctrl+Alt+Key)</li>
                  <li><strong>Purpose:</strong> Allows typing of accented characters and special symbols common in historical documents</li>
                  <li><strong>Use when:</strong> Documents contain non-English characters or accented letters</li>
                </ul>
              </div>

              <hr className="my-6" />

              <h2 className="text-xl font-semibold mb-4">Special Character Input</h2>
              <p className="mb-4">When <strong>Special Characters</strong> is enabled, use these keyboard combinations:</p>
              
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <div className="flex justify-between border-b py-1"><span><code className="px-1 rounded">Ctrl + Alt + a</code></span><span className="font-bold">á</span></div>
                  <div className="flex justify-between border-b py-1"><span><code className="px-1 rounded">Ctrl + Alt + e</code></span><span className="font-bold">é</span></div>
                  <div className="flex justify-between border-b py-1"><span><code className="px-1 rounded">Ctrl + Alt + i</code></span><span className="font-bold">í</span></div>
                  <div className="flex justify-between border-b py-1"><span><code className="px-1 rounded">Ctrl + Alt + o</code></span><span className="font-bold">ó</span></div>
                  <div className="flex justify-between border-b py-1"><span><code className="px-1 rounded">Ctrl + Alt + u</code></span><span className="font-bold">ú</span></div>
                  <div className="flex justify-between border-b py-1"><span><code className="px-1 rounded">Ctrl + Alt + n</code></span><span className="font-bold">ñ</span></div>
                  <div className="flex justify-between border-b py-1"><span><code className="px-1 rounded">Ctrl + Alt + c</code></span><span className="font-bold">ç</span></div>
                </div>
                <div>
                  <div className="flex justify-between border-b py-1"><span><code className="px-1 rounded">Ctrl + Alt + A</code></span><span className="font-bold">Á</span></div>
                  <div className="flex justify-between border-b py-1"><span><code className="px-1 rounded">Ctrl + Alt + E</code></span><span className="font-bold">É</span></div>
                  <div className="flex justify-between border-b py-1"><span><code className="px-1 rounded">Ctrl + Alt + I</code></span><span className="font-bold">Í</span></div>
                  <div className="flex justify-between border-b py-1"><span><code className="px-1 rounded">Ctrl + Alt + O</code></span><span className="font-bold">Ó</span></div>
                  <div className="flex justify-between border-b py-1"><span><code className="px-1 rounded">Ctrl + Alt + U</code></span><span className="font-bold">Ú</span></div>
                  <div className="flex justify-between border-b py-1"><span><code className="px-1 rounded">Ctrl + Alt + N</code></span><span className="font-bold">Ñ</span></div>
                  <div className="flex justify-between border-b py-1"><span><code className="px-1 rounded">Ctrl + Alt + C</code></span><span className="font-bold">Ç</span></div>
                </div>
              </div>

              <div className="bg-green-200 p-3 rounded mb-6">
                <p><strong>Example:</strong> To type "José", enable Special Characters and type: <code className="px-1 rounded">J</code> + <code className="px-1 rounded">Ctrl+Alt+o</code> + <code className="px-1 rounded">s</code> + <code className="px-1 rounded">Ctrl+Alt+e</code></p>
              </div>

              <hr className="my-6" />

              <h2 className="text-xl font-semibold mb-4">Image Controls</h2>
              
              <h3 className="text-lg font-semibold mb-3">Zoom Controls</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>➕ Plus button:</strong> Zoom in (increase image size)</li>
                <li><strong>➖ Minus button:</strong> Zoom out (decrease image size)</li>
                <li><strong>↺ Reset button:</strong> Reset zoom to 100% and center the image</li>
                <li><strong>Zoom percentage:</strong> Shows current zoom level</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">Image Adjustment</h3>
              <ul className="list-disc pl-6 mb-6">
                <li><strong>Contrast slider:</strong> Adjust image contrast (0-100)</li>
                <li><strong>Brightness slider:</strong> Adjust image brightness (0-100)</li>
                <li><strong>Pan/Move image:</strong> Click and drag the image to move it around when zoomed in</li>
              </ul>

              <hr className="my-6" />

              <h2 className="text-xl font-semibold mb-4">Data Entry Table</h2>
              
              <h3 className="text-lg font-semibold mb-3">Understanding the Fields</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-4 text-sm">
                <div><strong>Image:</strong> Document identifier (auto-filled)</div>
                <div><strong>Language:</strong> Language of the document</div>
                <div><strong>Event_D/Event_M/Event_Y:</strong> Event date, month, and year</div>
                <div><strong>Given/Surname:</strong> Person's first and last name</div>
                <div><strong>Sex:</strong> Gender (M/F)</div>
                <div><strong>Age:</strong> Person's age</div>
                <div><strong>Death_D/Death_M/Death_Y:</strong> Death date, month, and year</div>
                <div><strong>Fa_Given/Fa_Surname:</strong> Father's first and last name</div>
                <div><strong>Mo_Given/Mo_Surname:</strong> Mother's first and last name</div>
                <div><strong>Sp_Given/Sp_Surname:</strong> Spouse's first and last name</div>
              </div>

              <h3 className="text-lg font-semibold mb-3">Visual Indicators</h3>
              <ul className="list-disc pl-6 mb-6">
                <li><span className="px-2 py-1 rounded">🟡 Yellow row:</span> Currently active/selected row</li>
                <li><span className="px-2 py-1 rounded">🟢 Green cells:</span> Fields that contain data</li>
                <li><span className="px-2 py-1 rounded">⚪ White cells:</span> Empty fields that need data</li>
              </ul>

              <hr className="my-6" />

              <h2 className="text-xl font-semibold mb-4">Adding New Rows</h2>
              
              <h3 className="text-lg font-semibold mb-3">Method 1: Tab Navigation (Recommended)</h3>
              <ol className="list-decimal pl-6 mb-4">
                <li>Navigate to the <strong>last field</strong> in any row (Sp_Surname)</li>
                <li>Press <strong>Tab</strong> key</li>
                <li>✅ A new empty row will automatically be created</li>
                <li>✅ Cursor will jump to the first field of the new row</li>
              </ol>

              <div className="bg-green-200 p-3 rounded mb-6">
                <p><strong>💡 Tip:</strong> This is the fastest way to add multiple records - just keep tabbing through your data entry!</p>
              </div>

              <hr className="my-6" />

              <h2 className="text-xl font-semibold mb-4">Deleting Rows</h2>
              
              <h3 className="text-lg font-semibold mb-3">How to Delete</h3>
              <ol className="list-decimal pl-6 mb-4">
                <li>Locate the <strong>× button</strong> in the first column (Image field) of the row you want to delete</li>
                <li>Click the <strong>×</strong> button</li>
                <li>✅ Row will be removed immediately</li>
              </ol>

              <h3 className="text-lg font-semibold mb-3">Important Notes</h3>
              <ul className="list-disc pl-6 mb-6">
                <li><span className="text-red-600">⚠️ <strong>Cannot delete the last remaining row</strong></span> - you must always have at least one row</li>
                <li><span className="text-red-600">⚠️ <strong>No undo function</strong></span> - deleted rows cannot be recovered</li>
                <li>✅ <strong>Active row switching:</strong> If you delete the currently selected row, selection automatically moves to the first available row</li>
              </ul>

              <hr className="my-6" />

              <h2 className="text-xl font-semibold mb-4">Auto-Save Features</h2>
              
              <h3 className="text-lg font-semibold mb-3">Automatic Saving</h3>
              <ul className="list-disc pl-6 mb-4">
                <li>💾 <strong>Auto-save every 30 seconds</strong> while working</li>
                <li>💾 <strong>Save 2 seconds after you stop typing</strong> in any field</li>
                <li>👁️ <strong>Save status indicator</strong> shows current save state:</li>
                <ul className="list-disc pl-6 mt-2">
                  <li><span className="text-orange-600">🟠 "💾 Saving..."</span> - Currently saving</li>
                  <li><span className="text-green-600">🟢 "✅ Saved [time]"</span> - Successfully saved with timestamp</li>
                  <li><span className="text-gray-500">🔘 "⏳ Not saved"</span> - No recent saves</li>
                </ul>
              </ul>

              <h3 className="text-lg font-semibold mb-3">Manual Save</h3>
              <ul className="list-disc pl-6 mb-6">
                <li>Click <strong>Submit</strong> button to finalize and submit your work</li>
                <li><span className="text-red-600">⚠️ Once submitted, you cannot make further changes</span></li>
              </ul>

              <hr className="my-6" />

              <h2 className="text-xl font-semibold mb-4">Best Practices</h2>
              
              <h3 className="text-lg font-semibold mb-3">Workflow Tips</h3>
              <ol className="list-decimal pl-6 mb-4">
                <li><strong>Enable Guide Line</strong> when starting to help track document lines</li>
                <li><strong>Use First Char Capslock</strong> for name fields to ensure proper capitalization</li>
                <li><strong>Enable Special Characters</strong> before starting if document contains accented text</li>
                <li><strong>Zoom in</strong> to read small or unclear text</li>
                <li><strong>Use Tab navigation</strong> to quickly move between fields and add new rows</li>
              </ol>

              <h3 className="text-lg font-semibold mb-3">Data Entry Tips</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Fill fields left to right</strong> for systematic data entry</li>
                <li><strong>Use consistent formatting</strong> for dates and names</li>
                <li><strong>Check your work</strong> before submitting - look for green-highlighted completed fields</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">Troubleshooting</h3>
              <ul className="list-disc pl-6 mb-6">
                <li><strong>Special characters not working:</strong> Ensure checkbox is enabled and use Ctrl+Alt+letter</li>
                <li><strong>Can't delete row:</strong> Must have at least one row remaining</li>
                <li><strong>Tab not creating new row:</strong> Make sure you're in the last field (Sp_Surname)</li>
              </ul>

              <hr className="my-6" />

              <h2 className="text-xl font-semibold mb-4">Completion and Submission</h2>
              
              <h3 className="text-lg font-semibold mb-3">Progress Tracking</h3>
              <ul className="list-disc pl-6 mb-4">
                <li><strong>Progress percentage</strong> shown in top-right corner</li>
                <li>Based on <strong>number of filled fields</strong> vs total fields</li>
                <li>Helps track completion status</li>
              </ul>

              <h3 className="text-lg font-semibold mb-3">Final Steps</h3>
              <ol className="list-decimal pl-6 mb-6">
                <li><strong>Review all entries</strong> for accuracy</li>
                <li><strong>Check progress percentage</strong> - aim for 100% if all data is available</li>
                <li><strong>Click Submit</strong> when ready to finalize</li>
                <li>✅ <strong>Success message</strong> confirms submission</li>
                <li><strong>Return to Dashboard</strong> automatically after submission</li>
              </ol>

              <hr className="my-6" />

              <div className="bg-green-200 p-4 rounded">
                <p className="text-center"><em>💡 Need help? Refer to this guide for step-by-step instructions.</em></p>
              </div>
              
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
