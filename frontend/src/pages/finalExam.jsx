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

  // Toolbar state
  const [toolbarState, setToolbarState] = useState({
    verticalMode: false,
    guideLine: true,
    zoneBox: false,
    topZone: false,
    moveByCell: false,
    editMode: false,
    movingLayer: true,
    firstCharCapsLock: false,
    pressSpacebar: false,
    dictionary: true,
    ignoreCase: false,
    toolTip: false,
    onlyOneColumn: false,
  });

  // Annotation data
  const [recordData, setRecordData] = useState({
    image: "004413935_00143",
    langua: "es",
    event_d: "30",
    event: "",
    event_y: "1908",
    given: "Modesto",
    surname: "Claveria",
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
  });

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
      const userId = user.user_metadata?.user_id || "unknown";

      // Check for existing annotation
      const { data: existingAnnotation, error: fetchError } = await supabase
        .from("annotations")
        .select("*")
        .eq("auth_user_id", user.id)
        .eq("image_name", "004413935_00143")
        .single();

      if (existingAnnotation && !fetchError) {
        // Load existing annotation
        setAnnotationId(existingAnnotation.id);
        setRecordData({
          image: existingAnnotation.image_name,
          langua: existingAnnotation.langua || "",
          event_d: existingAnnotation.event_d || "",
          event: existingAnnotation.event || "",
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
      } else {
        // Create new annotation
        const { data: newAnnotation, error: createError } = await supabase
          .from("annotations")
          .insert([
            {
              user_id: userId,
              auth_user_id: user.id,
              image_name: "004413935_00143",
              status: "in_progress",
            },
          ])
          .select()
          .single();

        if (createError) {
          console.error("Error creating annotation:", createError);
        } else {
          setAnnotationId(newAnnotation.id);
        }
      }

      // Create new session
      const { data: newSession, error: sessionError } = await supabase
        .from("annotation_sessions")
        .insert([
          {
            annotation_id: annotationId,
            user_id: userId,
            auth_user_id: user.id,
            zoom_level: zoom,
            pan_x: panX,
            pan_y: panY,
            contrast: contrast,
            brightness: brightness,
          },
        ])
        .select()
        .single();

      if (!sessionError) {
        setSessionId(newSession.id);
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
        langua: recordData.langua,
        event_d: recordData.event_d,
        event: recordData.event,
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
    setRecordData((prev) => ({
      ...prev,
      [field]: value,
    }));
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
              <span className="font-medium">Project</span>
              <input type="checkbox" className="w-4 h-4" />

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
                  checked={toolbarState.zoneBox}
                  onChange={() => toggleToolbar("zoneBox")}
                  className="w-4 h-4"
                />
                <span>Zone Box</span>
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
          <div className="p-4 flex justify-center items-center h-full">
            {/* Document Image */}
            <div
              className="relative"
              style={{
                transform: `translate(${panX}px, ${panY}px)`,
              }}
            >
              {!imageError ? (
                <img
                  ref={imageRef}
                  src="/src/assets/document.jpeg" // Fixed path
                  alt="Historical Document"
                  className="max-w-none shadow-lg select-none"
                  style={{
                    filter: `contrast(${contrast + 50}%) brightness(${
                      brightness + 50
                    }%)`,
                    transform: `scale(${zoom / 100})`,
                    transformOrigin: "center center",
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
                        ></path>
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

              {/* Guide Line Overlay */}
              {toolbarState.guideLine && (
                <div className="absolute top-0 left-1/2 w-px h-full bg-blue-500 opacity-50 pointer-events-none"></div>
              )}

              {/* Zone Box Overlay */}
              {toolbarState.zoneBox && (
                <div className="absolute inset-0 border-2 border-red-500 opacity-50 pointer-events-none"></div>
              )}
            </div>

            {/* Pan Instructions */}
            <div className="absolute top-4 left-4 bg-black bg-opacity-50 text-white p-2 rounded text-sm">
              Click and drag to move image
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
                  Langua
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Event_D
                </th>
                <th className="border border-gray-300 px-2 py-1 text-left">
                  Event
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
              <tr className="bg-yellow-100">
                {Object.entries(recordData).map(([key, value]) => (
                  <td
                    key={key}
                    className={`border border-gray-300 px-2 py-1 ${
                      value ? "bg-green-200" : ""
                    }`}
                  >
                    <input
                      type="text"
                      value={value}
                      onChange={(e) => handleInputChange(key, e.target.value)}
                      className="w-full bg-transparent text-xs focus:outline-none focus:ring-1 focus:ring-blue-500"
                      placeholder={
                        key === "image" ? "Image ID" : `Enter ${key}`
                      }
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
