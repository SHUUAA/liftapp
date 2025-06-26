
import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../utils/supabase/client';
import { UserExamScore } from '../types';

interface UserScoresTabProps {
  annotatorDbId: number;
}

const formatSupabaseError = (error: any): string => {
  if (error && typeof error === 'object') {
    let message = error.message || 'Unknown RPC error';
    if (error.details) message += ` Details: ${error.details}`;
    if (error.hint) message += ` Hint: ${error.hint}`;
    return message;
  }
  return String(error || 'Unknown error');
};

const UserScoresTab: React.FC<UserScoresTabProps> = ({ annotatorDbId }) => {
  const [scores, setScores] = useState<UserExamScore[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: rpcError } = await supabase.rpc('get_annotator_exam_scores', {
        p_annotator_db_id: annotatorDbId 
      });

      if (rpcError) {
        const formattedError = formatSupabaseError(rpcError);
        console.error('Error fetching scores (RPC Error):', rpcError); // Log the original object
        throw new Error(formattedError);
      }
      
      const processedScores = (data || []).map((score: any) => ({
        exam_code: score.exam_code,
        exam_name: score.exam_name,
        total_effective_user_keystrokes: score.total_effective_user_keystrokes,
        total_answer_key_keystrokes: score.total_answer_key_keystrokes,
        images_attempted: score.images_attempted,
        images_scored: score.images_scored,
        percentage_score: score.total_answer_key_keystrokes > 0 
          ? parseFloat(((score.total_effective_user_keystrokes / score.total_answer_key_keystrokes) * 100).toFixed(1))
          : 0,
      }));
      setScores(processedScores);

    } catch (e: any) {
      // If e is an Error object, e.message is already set (e.g. from the throw above)
      // Otherwise, format it.
      const errorMessage = e instanceof Error ? e.message : formatSupabaseError(e);
      setError(`Failed to load scores: ${errorMessage}. Please ensure the 'get_annotator_exam_scores' Supabase function is correctly set up and returns data in the expected format (including 'total_effective_user_keystrokes' and 'total_answer_key_keystrokes').`);
      console.error("Full error object/exception in fetchScores:", e); // Log the original exception
    } finally {
      setLoading(false);
    }
  }, [annotatorDbId]);

  useEffect(() => {
    if (annotatorDbId) {
      fetchScores();
    }
  }, [fetchScores, annotatorDbId]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        <p className="ml-4 text-slate-600">Loading scores...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md shadow" role="alert">
        <strong className="font-bold">Error:</strong>
        <span className="block sm:inline ml-2">{error}</span>
      </div>
    );
  }

  if (scores.length === 0) {
    return (
      <div className="bg-blue-50 border border-blue-300 text-blue-700 px-6 py-8 rounded-lg shadow-md text-center">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto mb-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2Z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12H9m6 3H9m3-6l-3 3m0 0l3 3m-3-3h6" />
        </svg>
        <h3 className="text-xl font-semibold mb-2">No Scores Yet</h3>
        <p className="text-slate-600">You haven't completed any exams with available answer keys, or scores are still being processed. Complete some tasks to see your scores here!</p>
      </div>
    );
  }

  return (
    <div className="bg-white shadow-xl rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm text-left text-slate-700">
          <thead className="text-xs text-slate-800 uppercase bg-slate-200 border-b border-slate-300">
            <tr>
              <th scope="col" className="px-6 py-4 font-semibold">Exam Name</th>
              <th scope="col" className="px-6 py-4 font-semibold text-center">Images Attempted</th>
              <th scope="col" className="px-6 py-4 font-semibold text-center">Images Scored</th>
              <th scope="col" className="px-6 py-4 font-semibold text-center">Effective Keystrokes</th>
              <th scope="col" className="px-6 py-4 font-semibold text-center">Total Key Keystrokes</th>
              <th scope="col" className="px-6 py-4 font-semibold text-center">Score (%)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {scores.map((score) => (
              <tr key={score.exam_code} className="hover:bg-slate-50 transition-colors duration-150">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-slate-900">{score.exam_name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">{score.images_attempted}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">{score.images_scored}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center text-green-600 font-semibold">{score.total_effective_user_keystrokes}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">{score.total_answer_key_keystrokes}</td>
                <td className="px-6 py-4 whitespace-nowrap text-center">
                  {score.total_answer_key_keystrokes > 0 ? (
                    <span className={`font-bold px-2 py-1 rounded-full text-xs ${
                      score.percentage_score! >= 75 ? 'bg-green-100 text-green-700' :
                      score.percentage_score! >= 50 ? 'bg-yellow-100 text-yellow-700' :
                      'bg-red-100 text-red-700'
                    }`}>
                      {score.percentage_score}%
                    </span>
                  ) : (
                    <span className="text-slate-500 italic text-xs">N/A*</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
       {scores.some(s => s.total_answer_key_keystrokes === 0 && s.images_attempted > 0) && (
        <p className="px-6 py-3 text-xs text-slate-500 bg-slate-50 border-t border-slate-200">
          * N/A means no answer key was available for the images you attempted in this exam, or the answer key had no scorable keystrokes (e.g., all relevant cells in the key were empty).
        </p>
      )}
    </div>
  );
};

export default UserScoresTab;
