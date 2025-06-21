import React, { useState } from "react";
import { X, Save, AlertCircle } from "lucide-react";

const AnswerKeyForm = ({
  onClose,
  onSave,
  examType = "baptism",
  imageName = "",
  existingAnswers = null,
}) => {
  const [answers, setAnswers] = useState(
    existingAnswers || {
      language: "",
      event_day: "",
      event_month: "",
      event_year: "",
      given_name: "",
      surname: "",
      sex: "",
      birth_day: "",
      birth_month: "",
      birth_year: "",
      father_given_name: "",
      father_surname: "",
      mother_given_name: "",
      mother_surname: "",
      spouse_given_name: "",
      spouse_surname: "",
    }
  );

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleInputChange = (field, value) => {
    setAnswers((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      // Validate required fields
      if (!answers.given_name || !answers.surname) {
        throw new Error("Given name and surname are required");
      }

      // Convert day/month/year strings to numbers
      const processedAnswers = { ...answers };
      [
        "event_day",
        "event_month",
        "event_year",
        "birth_day",
        "birth_month",
        "birth_year",
      ].forEach((field) => {
        if (processedAnswers[field] && processedAnswers[field] !== "") {
          processedAnswers[field] = parseInt(processedAnswers[field]);
        }
      });

      await onSave({
        image_name: imageName,
        exam_type: examType,
        answers: processedAnswers,
      });

      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fieldGroups = {
    basic: [
      { key: "language", label: "Language", type: "text" },
      { key: "given_name", label: "Given Name", type: "text", required: true },
      { key: "surname", label: "Surname", type: "text", required: true },
      {
        key: "sex",
        label: "Sex",
        type: "select",
        options: ["", "Male", "Female"],
      },
    ],
    event: [
      { key: "event_day", label: "Event Day", type: "number", min: 1, max: 31 },
      {
        key: "event_month",
        label: "Event Month",
        type: "number",
        min: 1,
        max: 12,
      },
      {
        key: "event_year",
        label: "Event Year",
        type: "number",
        min: 1800,
        max: 2100,
      },
    ],
    birth: [
      { key: "birth_day", label: "Birth Day", type: "number", min: 1, max: 31 },
      {
        key: "birth_month",
        label: "Birth Month",
        type: "number",
        min: 1,
        max: 12,
      },
      {
        key: "birth_year",
        label: "Birth Year",
        type: "number",
        min: 1800,
        max: 2100,
      },
    ],
    parents: [
      { key: "father_given_name", label: "Father Given Name", type: "text" },
      { key: "father_surname", label: "Father Surname", type: "text" },
      { key: "mother_given_name", label: "Mother Given Name", type: "text" },
      { key: "mother_surname", label: "Mother Surname", type: "text" },
    ],
  };

  // Add spouse fields for marriage records
  if (examType === "marriage") {
    fieldGroups.spouse = [
      { key: "spouse_given_name", label: "Spouse Given Name", type: "text" },
      { key: "spouse_surname", label: "Spouse Surname", type: "text" },
    ];
  }

  const renderField = (field) => {
    const value = answers[field.key] || "";

    if (field.type === "select") {
      return (
        <select
          value={value}
          onChange={(e) => handleInputChange(field.key, e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          disabled={loading}
        >
          {field.options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      );
    }

    return (
      <input
        type={field.type}
        value={value}
        onChange={(e) => handleInputChange(field.key, e.target.value)}
        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        placeholder={`Enter ${field.label.toLowerCase()}`}
        min={field.min}
        max={field.max}
        disabled={loading}
      />
    );
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">
              {existingAnswers ? "Edit" : "Create"} Answer Key
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              Image: {imageName} | Type: {examType}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={loading}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Form Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Basic Information */}
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Basic Information
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {fieldGroups.basic.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                        {field.required && (
                          <span className="text-red-500 ml-1">*</span>
                        )}
                      </label>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Event Date */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Event Date
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {fieldGroups.event.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                      </label>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Birth Date */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Birth Date
                </h3>
                <div className="grid grid-cols-3 gap-4">
                  {fieldGroups.birth.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                      </label>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Parents and Spouse Information */}
            <div className="space-y-6">
              {/* Parents */}
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Parents
                </h3>
                <div className="grid grid-cols-1 gap-4">
                  {fieldGroups.parents.map((field) => (
                    <div key={field.key}>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {field.label}
                      </label>
                      {renderField(field)}
                    </div>
                  ))}
                </div>
              </div>

              {/* Spouse (for marriage records) */}
              {examType === "marriage" && fieldGroups.spouse && (
                <div>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Spouse
                  </h3>
                  <div className="grid grid-cols-1 gap-4">
                    {fieldGroups.spouse.map((field) => (
                      <div key={field.key}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {field.label}
                        </label>
                        {renderField(field)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-4 p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading || !answers.given_name || !answers.surname}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                <span>Saving...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save Answer Key</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnswerKeyForm;
