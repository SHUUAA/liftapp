import React from "react";
import { AnnotatorInfo, UserExamScoreMetrics } from "../../types";
import { EXAMS_DATA, USER_ID_PREFIXES } from "../../constants";

interface AnnotatorsTabProps {
  isLoading: boolean;
  paginatedAnnotators: AnnotatorInfo[];
  processedAnnotators: AnnotatorInfo[];
  sortConfig: {
    key: keyof AnnotatorInfo | null;
    direction: "ascending" | "descending";
  };
  requestSort: (key: keyof AnnotatorInfo) => void;
  onRefresh: () => void;
  annotatorSearchTerm: string;
  setAnnotatorSearchTerm: (value: string) => void;
  filterPrefix: string;
  setFilterPrefix: (value: string) => void;
  filterDate: string;
  setFilterDate: (value: string) => void;
  completionStatusFilter: string;
  setCompletionStatusFilter: (value: string) => void;
  specificCompletionDate: string;
  setSpecificCompletionDate: (value: string) => void;
  scoreFilter: string;
  setScoreFilter: (value: string) => void;
  filterBatches: string;
  setFilterBatches: (value: string) => void;
  currentPage: number;
  setCurrentPage: (page: number) => void;
  rowsPerPage: number;
}

const formatDurationForAdmin = (totalSeconds?: number): string => {
  if (totalSeconds === undefined || totalSeconds === null || totalSeconds < 0) {
    return "N/A";
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
};

const convertToCSV = (
  data: AnnotatorInfo[],
  columnsToInclude: {
    key: keyof AnnotatorInfo | string;
    header: string;
    isExamSpecific?: boolean;
    examCode?: string;
    metricKey?:
      | keyof UserExamScoreMetrics
      | "duration_seconds"
      | "completed_at";
  }[]
) => {
  if (!data || data.length === 0) {
    return "";
  }
  const headers = columnsToInclude.map((col) => col.header).join(",");
  const rows = data.map((row) => {
    return columnsToInclude
      .map((col) => {
        let value: any;
        if (col.isExamSpecific && col.examCode && col.metricKey) {
          if (col.metricKey === "duration_seconds") {
            value = row.per_exam_scores?.[col.examCode]?.duration_seconds;
            if (typeof value === "number") {
              const minutes = Math.floor(value / 60);
              const seconds = value % 60;
              value = `${minutes}m ${seconds}s`;
            } else {
              value = "N/A";
            }
          } else {
            value =
              row.per_exam_scores?.[col.examCode]?.[
                col.metricKey as keyof UserExamScoreMetrics
              ];
          }
        } else {
          value = row[col.key as keyof AnnotatorInfo];
        }

        if (value === null || value === undefined) {
          value = "";
        } else if (
          col.key === "created_at" ||
          col.key === "overall_completion_date" ||
          (col.isExamSpecific && col.metricKey === "completed_at")
        ) {
          value = new Date(value).toLocaleDateString();
        } else if (
          typeof value === "number" &&
          (col.key === "overall_score_percentage" ||
            (col.metricKey === "score_percentage" && col.isExamSpecific))
        ) {
          value = `${value.toFixed(1)}%`;
        } else {
          value = String(value);
        }

        if (
          value.includes(",") ||
          value.includes('"') ||
          value.includes("\n")
        ) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      })
      .join(",");
  });
  return `${headers}\n${rows.join("\n")}`;
};

const SortIcon: React.FC<{
  direction: "ascending" | "descending" | null;
}> = ({ direction }) => {
  if (!direction) {
    return (
      <svg
        className="w-3 h-3 text-slate-400 inline-block"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M8 9l4-4 4 4m0 6l-4 4-4-4"
        />
      </svg>
    );
  }
  return direction === "ascending" ? (
    <svg
      className="w-3 h-3 text-blue-500 inline-block"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M5 15l7-7 7 7"
      />
    </svg>
  ) : (
    <svg
      className="w-3 h-3 text-blue-500 inline-block"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  );
};

const RefreshIcon = ({ spinning }: { spinning: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={1.5}
    stroke="currentColor"
    className={`w-5 h-5 ${spinning ? "animate-spin" : ""}`}
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
    />
  </svg>
);

const AnnotatorsTab: React.FC<AnnotatorsTabProps> = ({
  isLoading,
  paginatedAnnotators,
  processedAnnotators,
  sortConfig,
  requestSort,
  onRefresh,
  annotatorSearchTerm,
  setAnnotatorSearchTerm,
  filterPrefix,
  setFilterPrefix,
  filterDate,
  setFilterDate,
  completionStatusFilter,
  setCompletionStatusFilter,
  specificCompletionDate,
  setSpecificCompletionDate,
  scoreFilter,
  setScoreFilter,
  filterBatches,
  setFilterBatches,
  currentPage,
  setCurrentPage,
  rowsPerPage,
}) => {
  const totalPages = Math.ceil(processedAnnotators.length / rowsPerPage);

  const handleExportAnnotatorsToCSV = () => {
    const columnsToExport: {
      key: keyof AnnotatorInfo | string;
      header: string;
      isExamSpecific?: boolean;
      examCode?: string;
      metricKey?:
        | keyof UserExamScoreMetrics
        | "duration_seconds"
        | "completed_at";
    }[] = [
      { key: "id", header: "DB ID" },
      { key: "liftapp_user_id", header: "LiftApp User ID" },
      { key: "created_at", header: "Registered On" },
      { key: "overall_completion_date", header: "Overall Completion Date" },
      { key: "total_images_attempted_overall", header: "Overall Batches" },
      {
        key: "total_effective_user_keystrokes_overall",
        header: "Overall Effective Keystrokes",
      },
      {
        key: "total_answer_key_keystrokes_overall",
        header: "Overall Total Keystrokes",
      },
      { key: "total_retakes_overall", header: "Overall Retakes" },
      { key: "overall_score_percentage", header: "Overall Score (%)" },
    ];
    EXAMS_DATA.forEach((exam) => {
      columnsToExport.push(
        {
          key: `${exam.id}_images_attempted`,
          header: `${exam.name} Batches`,
          isExamSpecific: true,
          examCode: exam.id,
          metricKey: "images_attempted",
        },
        {
          key: `${exam.id}_retakes`,
          header: `${exam.name} Retakes`,
          isExamSpecific: true,
          examCode: exam.id,
          metricKey: "retakes",
        },
        {
          key: `${exam.id}_effective_keystrokes`,
          header: `${exam.name} Effective Keystrokes`,
          isExamSpecific: true,
          examCode: exam.id,
          metricKey: "total_effective_user_keystrokes",
        },
        {
          key: `${exam.id}_total_keystrokes`,
          header: `${exam.name} Total Keystrokes`,
          isExamSpecific: true,
          examCode: exam.id,
          metricKey: "total_answer_key_keystrokes",
        },
        {
          key: `${exam.id}_duration_seconds`,
          header: `${exam.name} Duration`,
          isExamSpecific: true,
          examCode: exam.id,
          metricKey: "duration_seconds",
        },
        {
          key: `${exam.id}_score_percentage`,
          header: `${exam.name} Score (%)`,
          isExamSpecific: true,
          examCode: exam.id,
          metricKey: "score_percentage",
        },
        {
          key: `${exam.id}_completed_at`,
          header: `${exam.name} Date Completed`,
          isExamSpecific: true,
          examCode: exam.id,
          metricKey: "completed_at",
        }
      );
    });
    const csvData = convertToCSV(processedAnnotators, columnsToExport);
    const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "annotators_detailed_scores.csv");
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getSortIcon = (key: keyof AnnotatorInfo) =>
    sortConfig.key !== key ? (
      <SortIcon direction={null} />
    ) : (
      <SortIcon direction={sortConfig.direction} />
    );

  return (
    <div className="p-6 bg-slate-50 rounded-lg shadow">
      <div className="flex flex-wrap gap-y-4 justify-between items-center mb-4">
        <h3 className="text-xl font-semibold text-slate-700">
          Annotator Management & Scores
        </h3>
        <div className="flex items-center gap-x-3">
          <button
            onClick={onRefresh}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md transition-colors flex items-center gap-x-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-70 disabled:cursor-wait"
            disabled={isLoading}
          >
            <RefreshIcon spinning={isLoading} />
            Refresh
          </button>
          <button
            onClick={handleExportAnnotatorsToCSV}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
            disabled={isLoading || processedAnnotators.length === 0}
          >
            Export to CSV
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-x-4 gap-y-2 mb-4 p-4 bg-slate-100 rounded-md border border-slate-200">
        <div>
          <label
            htmlFor="annotatorSearch"
            className="block text-xs font-medium text-slate-600"
          >
            Search User ID
          </label>
          <input
            id="annotatorSearch"
            type="text"
            placeholder="Search..."
            value={annotatorSearchTerm}
            onChange={(e) => setAnnotatorSearchTerm(e.target.value)}
            className="mt-1 block w-full md:w-40 px-3 py-2 border border-slate-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
          />
        </div>
        <div>
          <label
            htmlFor="prefixFilter"
            className="block text-xs font-medium text-slate-600"
          >
            User Prefix
          </label>
          <select
            id="prefixFilter"
            value={filterPrefix}
            onChange={(e) => setFilterPrefix(e.target.value)}
            className="mt-1 block w-full pl-3 pr-8 py-2 border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Prefixes</option>
            {USER_ID_PREFIXES.map((prefix) => (
              <option key={prefix} value={prefix}>
                {prefix}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="registeredOnDate"
            className="block text-xs font-medium text-slate-600"
          >
            Registered On
          </label>
          <div className="flex items-center mt-1">
            <input
              id="registeredOnDate"
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <button
              onClick={() => setFilterDate("")}
              aria-label="Clear date filter"
              className="px-3 py-2 bg-slate-200 border border-l-0 border-slate-300 rounded-r-md text-slate-600 hover:bg-slate-300"
            >
              Clear
            </button>
          </div>
        </div>
        <div>
          <label
            htmlFor="completionStatusFilter"
            className="block text-xs font-medium text-slate-600"
          >
            Completion Status
          </label>
          <select
            id="completionStatusFilter"
            value={completionStatusFilter}
            onChange={(e) => setCompletionStatusFilter(e.target.value)}
            className="mt-1 block w-full pl-3 pr-8 py-2 border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Statuses</option>
            <option value="completed">Has Completion Date</option>
            <option value="not_completed">No Completion Date</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="specificCompletionDate"
            className="block text-xs font-medium text-slate-600"
          >
            Completed On (Date)
          </label>
          <div className="flex items-center mt-1">
            <input
              id="specificCompletionDate"
              type="date"
              value={specificCompletionDate}
              onChange={(e) => setSpecificCompletionDate(e.target.value)}
              className="block w-full px-3 py-2 border border-slate-300 rounded-l-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <button
              onClick={() => setSpecificCompletionDate("")}
              aria-label="Clear date filter"
              className="px-3 py-2 bg-slate-200 border border-l-0 border-slate-300 rounded-r-md text-slate-600 hover:bg-slate-300"
            >
              Clear
            </button>
          </div>
        </div>
        <div>
          <label
            htmlFor="scoreFilter"
            className="block text-xs font-medium text-slate-600"
          >
            Overall Score
          </label>
          <select
            id="scoreFilter"
            value={scoreFilter}
            onChange={(e) => setScoreFilter(e.target.value)}
            className="mt-1 block w-full pl-3 pr-8 py-2 border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Scores</option>
            <option value=">=90">Passed (&gt;= 90%)</option>
            <option value="<90">Failed (&lt; 90%)</option>
          </select>
        </div>
        <div>
          <label
            htmlFor="batchesFilter"
            className="block text-xs font-medium text-slate-600"
          >
            Overall Batches
          </label>
          <select
            id="batchesFilter"
            value={filterBatches}
            onChange={(e) => setFilterBatches(e.target.value)}
            className="mt-1 block w-full pl-3 pr-8 py-2 border-slate-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
          >
            <option value="all">All Batches</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </div>
      </div>

      {isLoading && (
        <p className="text-slate-500 italic">Loading annotators...</p>
      )}
      {!isLoading && processedAnnotators.length === 0 && (
        <p className="text-slate-500 italic text-center py-8">
          No annotators found
          {annotatorSearchTerm ||
          filterDate ||
          specificCompletionDate ||
          scoreFilter !== "all" ||
          filterBatches !== "all" ||
          filterPrefix !== "all"
            ? " matching your criteria"
            : ""}
          .
        </p>
      )}
      {!isLoading && processedAnnotators.length > 0 && (
        <>
          <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left text-slate-600 whitespace-nowrap">
              <thead className="text-xs text-slate-700 uppercase bg-slate-200">
                <tr>
                  <th
                    scope="col"
                    className="px-3 py-3 sticky left-0 bg-slate-200 z-10"
                  >
                    LiftApp User ID
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Registered On
                  </th>
                  <th scope="col" className="px-3 py-3">
                    <button
                      type="button"
                      onClick={() => requestSort("overall_completion_date")}
                      className="flex items-center justify-center w-full gap-1 font-semibold text-slate-700 uppercase"
                    >
                      Overall Completion Date{" "}
                      {getSortIcon("overall_completion_date")}
                    </button>
                  </th>
                  <th scope="col" className="px-3 py-3 text-center">
                    Overall Batches
                  </th>
                  <th scope="col" className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => requestSort("total_retakes_overall")}
                      className="flex items-center justify-center w-full gap-1 font-semibold text-slate-700 uppercase"
                    >
                      Overall Retakes {getSortIcon("total_retakes_overall")}
                    </button>
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-center"
                    title="Overall Effective Keystrokes"
                  >
                    Overall Effective Keystrokes
                  </th>
                  <th
                    scope="col"
                    className="px-3 py-3 text-center"
                    title="Overall Total Keystrokes"
                  >
                    Overall Total Keystrokes
                  </th>
                  <th scope="col" className="px-3 py-3 text-center">
                    <button
                      type="button"
                      onClick={() => requestSort("overall_score_percentage")}
                      className="flex items-center justify-center w-full gap-1 font-semibold text-slate-700 uppercase"
                    >
                      Overall Score (%){" "}
                      {getSortIcon("overall_score_percentage")}
                    </button>
                  </th>
                  {EXAMS_DATA.map((exam) => (
                    <React.Fragment key={exam.id}>
                      <th
                        scope="col"
                        className="px-3 py-3 text-center border-l border-slate-300"
                      >
                        {exam.name} Batches
                      </th>
                      <th scope="col" className="px-3 py-3 text-center">
                        {exam.name} Retakes
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-center"
                        title="Effective Keystrokes"
                      >
                        {exam.name} Effective Keystrokes
                      </th>
                      <th
                        scope="col"
                        className="px-3 py-3 text-center"
                        title="Total Keystrokes"
                      >
                        {exam.name} Total Keystrokes
                      </th>
                      <th scope="col" className="px-3 py-3 text-center">
                        {exam.name} Duration
                      </th>
                      <th scope="col" className="px-3 py-3 text-center">
                        {exam.name} Score (%)
                      </th>
                      <th scope="col" className="px-3 py-3 text-center">
                        {exam.name} Date Completed
                      </th>
                    </React.Fragment>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {paginatedAnnotators.map((annotator) => (
                  <tr key={annotator.id} className="bg-white hover:bg-slate-50">
                    <td className="px-3 py-3 font-medium text-slate-900 sticky left-0 bg-white hover:bg-slate-50 z-10">
                      {annotator.liftapp_user_id}
                    </td>
                    <td className="px-3 py-3">
                      {new Date(annotator.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-3 py-3 font-semibold text-indigo-600">
                      {annotator.overall_completion_date ? (
                        new Date(
                          annotator.overall_completion_date
                        ).toLocaleDateString()
                      ) : (
                        <span className="text-slate-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {annotator.total_images_attempted_overall ?? "N/A"}
                    </td>
                    <td className="px-3 py-3 text-center font-semibold">
                      {annotator.total_retakes_overall ?? 0}
                    </td>
                    <td className="px-3 py-3 text-center text-green-600 font-semibold">
                      {annotator.total_effective_user_keystrokes_overall ??
                        "N/A"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {annotator.total_answer_key_keystrokes_overall ?? "N/A"}
                    </td>
                    <td className="px-3 py-3 text-center">
                      {annotator.overall_score_percentage !== undefined &&
                      annotator.overall_score_percentage !== null ? (
                        <span
                          className={`font-bold px-2 py-1 rounded-full text-xs ${
                            annotator.overall_score_percentage >= 90
                              ? "bg-green-100 text-green-700"
                              : annotator.overall_score_percentage >= 50
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                          }`}
                        >
                          {annotator.overall_score_percentage.toFixed(1)}%
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-xs">
                          N/A
                        </span>
                      )}
                    </td>
                    {EXAMS_DATA.map((exam) => {
                      const examScores = annotator.per_exam_scores?.[exam.id];
                      return (
                        <React.Fragment key={exam.id}>
                          <td className="px-3 py-3 text-center border-l border-slate-300">
                            {examScores?.images_attempted ?? 0}
                          </td>
                          <td className="px-3 py-3 text-center font-semibold">
                            {examScores?.retakes ?? 0}
                          </td>
                          <td className="px-3 py-3 text-center text-green-600 font-semibold">
                            {examScores?.total_effective_user_keystrokes ?? 0}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {examScores?.total_answer_key_keystrokes ?? 0}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {formatDurationForAdmin(
                              examScores?.duration_seconds
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {examScores?.score_percentage !== undefined &&
                            examScores?.score_percentage !== null &&
                            (examScores.total_answer_key_keystrokes ?? 0) >
                              0 ? (
                              <span
                                className={`font-bold px-2 py-1 rounded-full text-xs ${
                                  examScores.score_percentage >= 90
                                    ? "bg-green-100 text-green-700"
                                    : examScores.score_percentage >= 50
                                    ? "bg-yellow-100 text-yellow-700"
                                    : "bg-red-100 text-red-700"
                                }`}
                              >
                                {examScores.score_percentage.toFixed(1)}%
                              </span>
                            ) : (
                              <span className="text-slate-500 italic text-xs">
                                N/A
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-3 text-center">
                            {examScores?.completed_at ? (
                              new Date(
                                examScores.completed_at
                              ).toLocaleDateString()
                            ) : (
                              <span className="text-slate-500 italic text-xs">
                                N/A
                              </span>
                            )}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between mt-4 px-2 py-1">
            <span className="text-sm text-slate-600">
              Showing{" "}
              <b>
                {Math.min(
                  (currentPage - 1) * rowsPerPage + 1,
                  processedAnnotators.length
                )}
              </b>{" "}
              to{" "}
              <b>
                {Math.min(
                  currentPage * rowsPerPage,
                  processedAnnotators.length
                )}
              </b>{" "}
              of <b>{processedAnnotators.length}</b> results
            </span>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-slate-700 font-medium">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage(Math.min(totalPages, currentPage + 1))
                }
                disabled={currentPage === totalPages || totalPages === 0}
                className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-300 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AnnotatorsTab;
