// src/hooks/useDatabase.js
import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase.js';




export const useDatabase = () => {
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  
  // Test connection on mount
  useEffect(() => {
    const testConnection = async () => {
      try {
        // Test connection by trying to select from users table
        const { error } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true });
        
        if (error) {
          console.error('Supabase connection error:', error);
          setConnectionStatus('error');
        } else {
          console.log('Supabase connected successfully');
          setConnectionStatus('connected');
        }
      } catch (error) {
        console.error('Connection test failed:', error);
        setConnectionStatus('error');
      }
    };
    
    testConnection();
  }, []);

  const createUser = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('users')
        .upsert({ 
          user_id: userId,
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (error) throw error;
      console.log('User created/updated:', data[0]);
      return data[0];
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  };

  const createSession = async (userId, examType) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .insert({
          user_id: userId,
          exam_type: examType,
          status: 'in_progress',
          progress: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select();
      
      if (error) throw error;
      console.log('Session created:', data[0]);
      return data[0];
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  };

  const saveAnnotations = async (sessionId, tableData) => {
    try {
      // First, delete existing annotations for this session
      const { error: deleteError } = await supabase
        .from('annotations')
        .delete()
        .eq('session_id', sessionId);
      
      if (deleteError) throw deleteError;
      
      // Prepare annotations data
      const annotations = tableData.map((row, index) => ({
        session_id: sessionId,
        row_order: index,
        image_name: row.image,
        language: row.language || null,
        event_day: row.eventD ? parseInt(row.eventD) : null,
        event_month: row.eventM ? parseInt(row.eventM) : null,
        event_year: row.eventY ? parseInt(row.eventY) : null,
        given_name: row.given || null,
        surname: row.surname || null,
        sex: row.sex || null,
        birth_day: row.birthD ? parseInt(row.birthD) : null,
        birth_month: row.birthM ? parseInt(row.birthM) : null,
        birth_year: row.birthY ? parseInt(row.birthY) : null,
        father_given_name: row.faGiven || null,
        father_surname: row.faSurname || null,
        mother_given_name: row.moGiven || null,
        mother_surname: row.moSurname || null,
        spouse_given_name: row.spGiven || null,
        spouse_surname: row.spSurname || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }));
      
      // Insert new annotations
      const { error } = await supabase
        .from('annotations')
        .insert(annotations);
      
      if (error) throw error;
      
      console.log('Annotations saved successfully for session:', sessionId);
      return true;
    } catch (error) {
      console.error('Error saving annotations:', error);
      return false;
    }
  };

  const updateSessionProgress = async (sessionId, progress) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          progress: progress,
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
        
      if (error) throw error;
      console.log('Progress updated:', sessionId, progress);
    } catch (error) {
      console.error('Error updating progress:', error);
    }
  };

  const submitSession = async (sessionId) => {
    try {
      const { error } = await supabase
        .from('sessions')
        .update({ 
          status: 'submitted',
          updated_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      if (error) throw error;
      console.log('Session submitted successfully:', sessionId);
      return true;
    } catch (error) {
      console.error('Error submitting session:', error);
      return false;
    }
  };

  // Additional function to get document images
  const getDocumentImages = async () => {
    try {
      const { data, error } = await supabase
        .from('document_images')
        .select('*')
        .order('created_at', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching document images:', error);
      return [];
    }
  };

  // Additional function to get a specific document image
  const getDocumentImage = async (imageId) => {
    try {
      const { data, error } = await supabase
        .from('document_images')
        .select('*')
        .eq('id', imageId)
        .single();
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching document image:', error);
      return null;
    }
  };

  // Additional function to create/upload document image metadata
  const createDocumentImage = async (imageName, imageUrl, examType, metadata = null) => {
    try {
      const { data, error } = await supabase
        .from('document_images')
        .insert({
          image_name: imageName,
          image_url: imageUrl,
          exam_type: examType,
          metadata: metadata,
          created_at: new Date().toISOString()
        })
        .select();
      
      if (error) throw error;
      console.log('Document image created:', data[0]);
      return data[0];
    } catch (error) {
      console.error('Error creating document image:', error);
      return null;
    }
  };

  // Additional helper function to get session annotations
  const getSessionAnnotations = async (sessionId) => {
    try {
      const { data, error } = await supabase
        .from('annotations')
        .select('*')
        .eq('session_id', sessionId)
        .order('row_order', { ascending: true });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching session annotations:', error);
      return [];
    }
  };

  // Additional helper function to get user sessions
  const getUserSessions = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('sessions')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error fetching user sessions:', error);
      return [];
    }
  };

  return {
    connectionStatus,
    createUser,
    createSession,
    saveAnnotations,
    updateSessionProgress,
    submitSession,
    getUserSessions,
    getSessionAnnotations,
    getDocumentImages,
    getDocumentImage,
    createDocumentImage
  };
};